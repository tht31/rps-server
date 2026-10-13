import { query, queryOne } from '../db';
import { logger } from '../utils/logger';
import { SCORE } from '../utils/constants';

interface TeamStanding {
  teamId: string;
  score: number;
  buchholz: number;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  opponents: string[];
}

// Lay danh sach xep hang Swiss hien tai
export async function getSwissStandings(): Promise<TeamStanding[]> {
  const rows = await query<any>(
    `SELECT s.team_id as "teamId", t.name as "teamName", s.score, s.buchholz,
            s.wins, s.draws, s.losses, s.played, s.opponents
     FROM swiss_standings s
     JOIN teams t ON t.id = s.team_id
     WHERE t.status = 'ACTIVE'
     ORDER BY s.score DESC, s.buchholz DESC, s.wins DESC`
  );
  return rows;
}

// Boc tham cap tran vong Swiss tiep theo
// Luat: Xep theo diem + Buchholz, cap voi nguoi co diem gan nhat chua gap nhau
export async function pairSwissRound(swissRound: number): Promise<{ team1Id: string; team2Id: string }[]> {
  const standings = await getSwissStandings();
  const pairs: { team1Id: string; team2Id: string }[] = [];
  const paired = new Set<string>();

  for (let i = 0; i < standings.length; i++) {
    const t1 = standings[i];
    if (paired.has(t1.teamId)) continue;

    // Tim doi phu hop: g?n nhat chua gap nhau
    let opponentIdx = -1;
    for (let j = i + 1; j < standings.length; j++) {
      const t2 = standings[j];
      if (paired.has(t2.teamId)) continue;
      if (!(t1.opponents || []).includes(t2.teamId)) {
        opponentIdx = j;
        break;
      }
    }

    // Fallback: Neu tat ca da gap nhau, cap voi nguoi tiep theo chua paired
    if (opponentIdx === -1) {
      for (let j = i + 1; j < standings.length; j++) {
        if (!paired.has(standings[j].teamId)) {
          opponentIdx = j;
          break;
        }
      }
    }

    if (opponentIdx !== -1) {
      paired.add(t1.teamId);
      paired.add(standings[opponentIdx].teamId);
      pairs.push({ team1Id: t1.teamId, team2Id: standings[opponentIdx].teamId });
    } else {
      logger.warn(`Swiss round ${swissRound}: Team ${t1.teamId} has no opponent (bye)`);
    }
  }

  logger.info(`Swiss round ${swissRound}: Generated ${pairs.length} pairs from ${standings.length} teams`);
  return pairs;
}

// Cap nhat diem sau khi co ket qua tran dau
export async function applyMatchResult(
  matchId: string,
  team1Id: string,
  team2Id: string,
  team1Wins: number,
  team2Wins: number,
  draws: number,
) {
  // Xac dinh nguoi thang
  let winnerId: string | null = null;
  let t1Score = 0, t2Score = 0;
  let t1Result = '', t2Result = '';

  if (team1Wins > team2Wins) {
    winnerId = team1Id;
    t1Score = SCORE.WIN; t2Score = SCORE.LOSS;
    t1Result = 'win'; t2Result = 'loss';
  } else if (team2Wins > team1Wins) {
    winnerId = team2Id;
    t1Score = SCORE.LOSS; t2Score = SCORE.WIN;
    t1Result = 'loss'; t2Result = 'win';
  } else {
    t1Score = SCORE.DRAW; t2Score = SCORE.DRAW;
    t1Result = 'draw'; t2Result = 'draw';
  }

  // Cap nhat match result
  await query(
    `UPDATE matches SET team1_wins=$1, team2_wins=$2, draws=$3, winner_id=$4, status='DONE', completed_at=NOW()
     WHERE id=$5`,
    [team1Wins, team2Wins, draws, winnerId, matchId]
  );

  // Cap nhat bang xep hang team1
  await query(
    `UPDATE swiss_standings SET
       score = score + $1,
       wins = wins + $2,
       draws = draws + $3,
       losses = losses + $4,
       played = played + 1,
       opponents = array_append(opponents, $5::uuid),
       updated_at = NOW()
     WHERE team_id = $6`,
    [t1Score, t1Result === 'win' ? 1 : 0, t1Result === 'draw' ? 1 : 0, t1Result === 'loss' ? 1 : 0, team2Id, team1Id]
  );

  // Cap nhat bang xep hang team2
  await query(
    `UPDATE swiss_standings SET
       score = score + $1,
       wins = wins + $2,
       draws = draws + $3,
       losses = losses + $4,
       played = played + 1,
       opponents = array_append(opponents, $5::uuid),
       updated_at = NOW()
     WHERE team_id = $6`,
    [t2Score, t2Result === 'win' ? 1 : 0, t2Result === 'draw' ? 1 : 0, t2Result === 'loss' ? 1 : 0, team1Id, team2Id]
  );

  // Tinh lai Buchholz (tong diem cua cac doi da gap)
  await recalcBuchholz(team1Id);
  await recalcBuchholz(team2Id);
}

// Tinh lai Buchholz cho 1 doi
async function recalcBuchholz(teamId: string) {
  await query(
    `UPDATE swiss_standings s
     SET buchholz = (
       SELECT COALESCE(SUM(s2.score), 0)
       FROM swiss_standings s2
       WHERE s2.team_id = ANY(s.opponents)
     )
     WHERE s.team_id = $1`,
    [teamId]
  );
}
