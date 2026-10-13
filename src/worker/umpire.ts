import { spawn } from 'child_process';
import path from 'path';
import { MatchJobPayload, MatchResult, MatchTurnResult, Move } from '../types';
import { logger } from '../utils/logger';
import { LIMITS, WIN_CONDITIONS_CLASSIC, WIN_CONDITIONS_EXTENDED } from '../utils/constants';

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const UMPIRE_SCRIPT = path.resolve(__dirname, '../../bot-runner/umpire_entrypoint.py');

// ============================================================
// Giao tiep voi bot Python qua stdin/stdout (JSON protocol)
// Moi luot:
//   Umpire -> Bot: JSON chua lich su nuoc di
//   Bot -> Umpire: mot trong: ROCK | PAPER | SCISSORS | LIZARD | SPOCK
// ============================================================

interface BotProcess {
  teamId: string;
  process: ReturnType<typeof spawn>;
  isAlive: boolean;
}

async function startBotProcess(botPath: string, teamId: string): Promise<BotProcess> {
  const proc = spawn(PYTHON_BIN, [UMPIRE_SCRIPT, botPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: LIMITS.BOT_COLD_START_MS + LIMITS.MATCH_ROUNDS_SWISS * LIMITS.MOVE_TIMEOUT_MS * 2,
    // Sandbox flags: Them neu chay tren Linux voi Docker
    // Tren Windows chi chay subprocess thong thuong (phat trien)
  });

  proc.stderr?.on('data', (data) => {
    logger.debug(`Bot ${teamId} stderr: ${data.toString().trim()}`);
  });

  return { teamId, process: proc, isAlive: true };
}

// Gui lich su va doi nuoc di, co timeout
async function getMove(
  bot: BotProcess,
  myMoves: Move[],
  opponentMoves: Move[],
  turnNumber: number
): Promise<{ move: Move; latencyMs: number }> {
  const payload = JSON.stringify({ myMoves, opponentMoves, turn: turnNumber }) + '\n';
  const startTime = Date.now();

  return new Promise((resolve) => {
    const timeoutHandle = setTimeout(() => {
      logger.warn(`Bot ${bot.teamId} timeout at turn ${turnNumber}`);
      resolve({ move: 'INVALID', latencyMs: LIMITS.MOVE_TIMEOUT_MS + 1 });
    }, LIMITS.BOT_MAX_WAIT_MS);

    let buffer = '';

    const onData = (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      if (lines.length >= 2) {
        clearTimeout(timeoutHandle);
        bot.process.stdout?.removeListener('data', onData);
        const raw = lines[0].trim().toUpperCase();
        const valid: Move[] = ['ROCK', 'PAPER', 'SCISSORS', 'LIZARD', 'SPOCK'];
        const move: Move = valid.includes(raw as Move) ? (raw as Move) : 'INVALID';
        resolve({ move, latencyMs: Date.now() - startTime });
      }
    };

    bot.process.stdout?.on('data', onData);

    try {
      bot.process.stdin?.write(payload);
    } catch {
      clearTimeout(timeoutHandle);
      resolve({ move: 'INVALID', latencyMs: 0 });
    }
  });
}

function judgeTurn(m1: Move, m2: Move, extended: boolean): 0 | 1 | 2 {
  if (m1 === m2) return 0;
  if (m1 === 'INVALID' && m2 === 'INVALID') return 0;
  if (m1 === 'INVALID') return 2;
  if (m2 === 'INVALID') return 1;

  const conditions = extended ? WIN_CONDITIONS_EXTENDED : WIN_CONDITIONS_CLASSIC;
  if (conditions[m1]?.includes(m2)) return 1;
  if (conditions[m2]?.includes(m1)) return 2;
  return 0;
}

export async function runMatch(payload: MatchJobPayload): Promise<MatchResult> {
  const { matchId, team1Id, team2Id, team1BotPath, team2BotPath, rounds, extendedRules } = payload;
  const startTime = Date.now();

  let bot1: BotProcess | null = null;
  let bot2: BotProcess | null = null;

  const turns: MatchTurnResult[] = [];
  let bot1Wins = 0, bot2Wins = 0, draws = 0;
  let disqualifiedBot: 1 | 2 | undefined;
  let disqualificationReason = '';

  const bot1MoveHistory: Move[] = [];
  const bot2MoveHistory: Move[] = [];

  try {
    // Khoi dong 2 tien trinh bot
    [bot1, bot2] = await Promise.all([
      startBotProcess(team1BotPath, team1Id),
      startBotProcess(team2BotPath, team2Id),
    ]);

    // Cho cold start
    await new Promise(r => setTimeout(r, 200));

    for (let t = 1; t <= rounds; t++) {
      // Lay nuoc di tu 2 bot song song
      const [r1, r2] = await Promise.all([
        getMove(bot1!, bot1MoveHistory, bot2MoveHistory, t),
        getMove(bot2!, bot2MoveHistory, bot1MoveHistory, t),
      ]);

      // Kiem tra timeout (100ms CPU)
      if (r1.latencyMs > LIMITS.MOVE_TIMEOUT_MS && !disqualifiedBot) {
        disqualifiedBot = 1;
        disqualificationReason = `Bot 1 exceeded ${LIMITS.MOVE_TIMEOUT_MS}ms timeout at turn #${t} (${r1.latencyMs}ms)`;
      }
      if (r2.latencyMs > LIMITS.MOVE_TIMEOUT_MS && !disqualifiedBot) {
        disqualifiedBot = 2;
        disqualificationReason = `Bot 2 exceeded ${LIMITS.MOVE_TIMEOUT_MS}ms timeout at turn #${t} (${r2.latencyMs}ms)`;
      }

      const m1: Move = disqualifiedBot === 1 ? 'INVALID' : r1.move;
      const m2: Move = disqualifiedBot === 2 ? 'INVALID' : r2.move;

      const winner = judgeTurn(m1, m2, extendedRules);
      if (winner === 1) bot1Wins++;
      else if (winner === 2) bot2Wins++;
      else draws++;

      turns.push({
        turn: t,
        bot1Move: m1,
        bot2Move: m2,
        bot1TimeMs: r1.latencyMs,
        bot2TimeMs: r2.latencyMs,
        winner,
      });

      bot1MoveHistory.push(m1);
      bot2MoveHistory.push(m2);

      if (disqualifiedBot) break;
    }
  } finally {
    // Tat tien trinh bot
    try { bot1?.process.kill('SIGKILL'); } catch {}
    try { bot2?.process.kill('SIGKILL'); } catch {}
  }

  let winnerId: string | null = null;
  if (disqualifiedBot === 1) winnerId = team2Id;
  else if (disqualifiedBot === 2) winnerId = team1Id;
  else if (bot1Wins > bot2Wins) winnerId = team1Id;
  else if (bot2Wins > bot1Wins) winnerId = team2Id;

  return {
    matchId,
    team1Id,
    team2Id,
    team1Wins: bot1Wins,
    team2Wins: bot2Wins,
    draws,
    winnerId,
    totalTurns: turns.length,
    disqualifiedBot,
    disqualificationReason,
    turns,
    durationMs: Date.now() - startTime,
  };
}
