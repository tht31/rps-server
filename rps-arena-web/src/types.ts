export type Move = 'ROCK' | 'PAPER' | 'SCISSORS' | 'LIZARD' | 'SPOCK' | 'INVALID';

export interface TeamMember {
  studentId: string;
  name: string;
  email?: string;
}

export interface Team {
  id: string;
  name: string;
  leader_id: string;
  members: TeamMember[] | string;
  status: 'ACTIVE' | 'DISQUALIFIED' | 'WITHDRAWN';
  created_at: string;
  score?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  played?: number;
  buchholz?: number;
  hasValidBot?: boolean;
}

export interface BotSubmission {
  id: string;
  version: number;
  file_hash: string;
  round_phase: string;
  is_valid: boolean;
  is_locked: boolean;
  syntax_log: string | null;
  created_at: string;
}

export interface MatchTurnResult {
  turn: number;
  bot1Move: Move;
  bot2Move: Move;
  bot1TimeMs: number;
  bot2TimeMs: number;
  winner: 0 | 1 | 2; // 0 = hoa, 1 = bot1, 2 = bot2
}

export interface MatchResult {
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
}

export interface MatchSummary {
  id: string;
  round_type: string;
  team1_id: string;
  team1_name: string;
  team1_wins: number;
  team2_id: string;
  team2_name: string;
  team2_wins: number;
  draws: number;
  winner_id: string | null;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR';
  created_at: string;
  completed_at?: string;
  disqualified_bot?: number;
  disqualification_reason?: string;
}

export interface Standing {
  teamId: string;
  teamName: string;
  score: number;
  buchholz: number;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  opponents: string[];
}
