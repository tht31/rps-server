import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { query, queryOne } from '../db';
import { getSwissStandings, pairSwissRound, applyMatchResult } from '../services/swiss';
import { enqueueMatch } from '../queues';
import { logger } from '../utils/logger';
import { LIMITS } from '../utils/constants';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// GET /api/tournaments/swiss/standings
export async function getStandings(req: Request, res: Response) {
  try {
    const standings = await getSwissStandings();
    const currentRound = await queryOne<any>(
      `SELECT MAX(CASE WHEN round_type LIKE 'SWISS_%' THEN CAST(SUBSTRING(round_type FROM 7) AS INT) ELSE 0 END) as round
       FROM matches WHERE status = 'DONE'`
    );
    return res.json({
      round: currentRound?.round || 0,
      totalTeams: standings.length,
      rankings: standings,
    });
  } catch (err) {
    logger.error('getStandings error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/tournaments/swiss/start-round - Chi BTC (Admin) goi
export async function startSwissRound(req: AuthRequest, res: Response) {
  const { roundNumber } = req.body;
  if (!roundNumber || roundNumber < 1 || roundNumber > LIMITS.SWISS_ROUNDS) {
    return res.status(400).json({ error: `roundNumber must be 1-${LIMITS.SWISS_ROUNDS}` });
  }

  try {
    // Kiem tra tat ca tran round truoc da xong chua
    const pending = await queryOne<any>(
      `SELECT COUNT(*) as cnt FROM matches WHERE round_type = $1 AND status != 'DONE'`,
      [`SWISS_${roundNumber - 1}`]
    );
    if (pending && parseInt(pending.cnt) > 0 && roundNumber > 1) {
      return res.status(409).json({ error: `Round ${roundNumber - 1} has ${pending.cnt} unfinished matches` });
    }

    // Boc tham cap tran
    const pairs = await pairSwissRound(roundNumber);
    if (pairs.length === 0) {
      return res.status(409).json({ error: 'No pairs generated - check team count' });
    }

    const matchIds: string[] = [];

    for (const pair of pairs) {
      // Lay bot hien tai cua moi doi
      const bot1 = await queryOne<any>(
        `SELECT storage_path FROM bot_submissions WHERE team_id = $1 AND is_valid = TRUE ORDER BY created_at DESC LIMIT 1`,
        [pair.team1Id]
      );
      const bot2 = await queryOne<any>(
        `SELECT storage_path FROM bot_submissions WHERE team_id = $1 AND is_valid = TRUE ORDER BY created_at DESC LIMIT 1`,
        [pair.team2Id]
      );

      if (!bot1 || !bot2) {
        logger.warn(`Skipping match: one team has no valid bot`, pair);
        continue;
      }

      // Tao record tran dau trong DB
      const matchRows = await query<any>(
        `INSERT INTO matches (round_type, team1_id, team2_id, log_file_path, status)
         VALUES ($1, $2, $3, $4, 'PENDING') RETURNING id`,
        [`SWISS_${roundNumber}`, pair.team1Id, pair.team2Id, '']
      );
      const matchId = matchRows[0].id;
      matchIds.push(matchId);

      // Day job vao Redis Queue voi priority cao (chinh thuc)
      await enqueueMatch({
        matchId,
        team1Id: pair.team1Id,
        team2Id: pair.team2Id,
        team1BotPath: bot1.storage_path,
        team2BotPath: bot2.storage_path,
        rounds: LIMITS.MATCH_ROUNDS_SWISS,
        phase: 'SWISS',
        extendedRules: false,
      }, 1); // priority 1 = cao nhat
    }

    logger.info(`Swiss round ${roundNumber} started: ${matchIds.length} matches queued`);
    return res.json({
      roundNumber,
      matchesQueued: matchIds.length,
      matchIds,
    });
  } catch (err) {
    logger.error('startSwissRound error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/arena/practice-match
export async function requestPracticeMatch(req: AuthRequest, res: Response) {
  if (!req.teamId) return res.status(401).json({ error: 'Unauthorized' });

  const { opponentBotId, rounds } = req.body;
  const matchRounds = Math.min(rounds || LIMITS.MATCH_ROUNDS_DEFAULT, 100);

  try {
    // Kiem tra gioi han 20 tran/ngay
    const today = new Date().toISOString().split('T')[0];
    await query(
      `INSERT INTO practice_limits (team_id, date, match_count)
       VALUES ($1, $2, 0) ON CONFLICT (team_id, date) DO NOTHING`,
      [req.teamId, today]
    );

    const limitRow = await queryOne<any>(
      'SELECT match_count FROM practice_limits WHERE team_id = $1 AND date = $2',
      [req.teamId, today]
    );

    if (limitRow && limitRow.match_count >= LIMITS.PRACTICE_MATCHES_PER_DAY) {
      return res.status(429).json({
        error: `Practice limit reached: ${LIMITS.PRACTICE_MATCHES_PER_DAY} matches per day`,
        today: limitRow.match_count,
      });
    }

    // Lay bot hien tai cua doi
    const myBot = await queryOne<any>(
      `SELECT storage_path FROM bot_submissions WHERE team_id = $1 AND is_valid = TRUE ORDER BY created_at DESC LIMIT 1`,
      [req.teamId]
    );
    if (!myBot) {
      return res.status(400).json({ error: 'No valid bot found. Please submit a valid bot first.' });
    }

    // Lay opponent bot (bot mau BTC hoac bot cua doi khac)
    let opponentPath = '';
    let opponentTeamId = opponentBotId;

    if (opponentBotId === 'starter_random' || !opponentBotId) {
      opponentPath = './bot-runner/starter_bots/random_bot.py';
      opponentTeamId = 'SYSTEM_BOT_RANDOM';
    } else {
      const opBot = await queryOne<any>(
        `SELECT storage_path FROM bot_submissions WHERE team_id = $1 AND is_valid = TRUE ORDER BY created_at DESC LIMIT 1`,
        [opponentBotId]
      );
      if (!opBot) return res.status(404).json({ error: 'Opponent bot not found' });
      opponentPath = opBot.storage_path;
    }

    // Tao match record
    const matchRows = await query<any>(
      `INSERT INTO matches (round_type, team1_id, team2_id, log_file_path, status)
       VALUES ('PRACTICE', $1, $2, '', 'PENDING') RETURNING id`,
      [req.teamId, opponentTeamId]
    );
    const matchId = matchRows[0].id;

    // Increment practice count
    await query(
      'UPDATE practice_limits SET match_count = match_count + 1 WHERE team_id = $1 AND date = $2',
      [req.teamId, today]
    );

    // Day vao queue voi priority thap (luyen tap)
    await enqueueMatch({
      matchId,
      team1Id: req.teamId,
      team2Id: opponentTeamId,
      team1BotPath: myBot.storage_path,
      team2BotPath: opponentPath,
      rounds: matchRounds,
      phase: 'PRACTICE',
      extendedRules: false,
    }, 10); // priority 10 = thap nhat

    return res.json({ matchId, status: 'QUEUED', rounds: matchRounds });
  } catch (err) {
    logger.error('requestPracticeMatch error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/matches/:matchId
export async function getMatch(req: Request, res: Response) {
  const { matchId } = req.params;
  try {
    const match = await queryOne<any>(
      `SELECT m.*, t1.name as team1_name, t2.name as team2_name
       FROM matches m
       LEFT JOIN teams t1 ON t1.id = m.team1_id
       LEFT JOIN teams t2 ON t2.id = m.team2_id
       WHERE m.id = $1`,
      [matchId]
    );
    if (!match) return res.status(404).json({ error: 'Match not found' });

    return res.json({
      id: match.id,
      roundType: match.round_type,
      team1: { id: match.team1_id, name: match.team1_name || 'System Bot' },
      team2: { id: match.team2_id, name: match.team2_name || 'System Bot' },
      team1Wins: match.team1_wins,
      team2Wins: match.team2_wins,
      draws: match.draws,
      winnerId: match.winner_id,
      status: match.status,
      disqualifiedBot: match.disqualified_bot,
      disqualificationReason: match.disqualification_reason,
      createdAt: match.created_at,
      completedAt: match.completed_at,
    });
  } catch (err) {
    logger.error('getMatch error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/matches/:matchId/log - Lay file replay log chi tiet tung luot
export async function getMatchLog(req: Request, res: Response) {
  const { matchId } = req.params;
  try {
    const match = await queryOne<any>(
      `SELECT id, log_file_path, status, winner_id FROM matches WHERE id = $1`,
      [matchId]
    );
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const possiblePaths = [
      match.log_file_path,
      path.resolve('./storage/logs', `${matchId}.json`),
      path.join(process.cwd(), 'storage', 'logs', `${matchId}.json`),
    ].filter(Boolean);

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const fileData = fs.readFileSync(p, 'utf-8');
        return res.json(JSON.parse(fileData));
      }
    }

    return res.status(404).json({ error: 'Replay log not yet available for this match' });
  } catch (err) {
    logger.error('getMatchLog error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/tournaments/swiss/matches - Danh sach cac tran dau
export async function getTournamentMatches(req: Request, res: Response) {
  const { roundType, status, limit = 50 } = req.query;
  try {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (roundType) {
      params.push(roundType);
      conditions.push(`m.round_type = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`m.status = $${params.length}`);
    }

    params.push(Number(limit) || 50);

    const matches = await query<any>(
      `SELECT m.id, m.round_type, m.status, m.created_at, m.completed_at,
              m.team1_id, COALESCE(t1.name, 'System Bot') as team1_name, m.team1_wins,
              m.team2_id, COALESCE(t2.name, 'System Bot') as team2_name, m.team2_wins,
              m.draws, m.winner_id, m.disqualified_bot, m.disqualification_reason
       FROM matches m
       LEFT JOIN teams t1 ON t1.id = m.team1_id
       LEFT JOIN teams t2 ON t2.id = m.team2_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.created_at DESC
       LIMIT $${params.length}`,
      params
    );
    return res.json(matches);
  } catch (err) {
    logger.error('getTournamentMatches error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
