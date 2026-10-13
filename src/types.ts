// ============================================================
// shared/types.ts - Dung chung giua API Server va Worker
// ============================================================

export type Move = 'ROCK' | 'PAPER' | 'SCISSORS' | 'LIZARD' | 'SPOCK' | 'INVALID';

export type RoundPhase = 'PRACTICE' | 'SWISS' | 'PLAYOFF' | 'FINALS';

export type MatchJobPayload = {
  matchId: string;
  team1Id: string;
  team2Id: string;
  team1BotPath: string;
  team2BotPath: string;
  rounds: number;
  phase: RoundPhase;
  extendedRules: boolean; // Rock Paper Scissors Lizard Spock cho chung ket
};

export type MatchTurnResult = {
  turn: number;
  bot1Move: Move;
  bot2Move: Move;
  bot1TimeMs: number;
  bot2TimeMs: number;
  winner: 0 | 1 | 2; // 0=draw, 1=bot1, 2=bot2
};

export type MatchResult = {
  matchId: string;
  team1Id: string;
  team2Id: string;
  team1Wins: number;
  team2Wins: number;
  draws: number;
  winnerId: string | null;
  totalTurns: number;
  disqualifiedBot?: 1 | 2;
  disqualificationReason?: string;
  turns: MatchTurnResult[];
  durationMs: number;
};
