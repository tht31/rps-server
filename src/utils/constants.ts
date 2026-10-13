// Constants - Gioi han he thong theo dac ta
export const LIMITS = {
  MOVE_TIMEOUT_MS: parseInt(process.env.MOVE_TIMEOUT_MS || '100'),
  BOT_COLD_START_MS: 3000,
  BOT_MAX_WAIT_MS: 1000,
  BOT_RAM_MB: 256,
  BOT_FILE_SIZE_BYTES: 1024 * 1024, // 1 MB
  MATCH_LOG_SIZE_BYTES: 1024 * 1024, // 1 MB
  MATCH_ROUNDS_DEFAULT: 50,
  MATCH_ROUNDS_SWISS: 50,
  MATCH_ROUNDS_FINALS: 100,
  PRACTICE_MATCHES_PER_DAY: 20,
  MAX_CONCURRENT_MATCHES: 8,
  TEAM_MAX_MEMBERS: 3,
  TEAM_MIN_MEMBERS: 1,
  SWISS_ROUNDS: 10,
  PLAYOFF_TOP_N: 32,
} as const;

export const SCORE = {
  WIN: 3,
  DRAW: 1,
  LOSS: 0,
} as const;

// Luat o?n tù tì co ban
export const WIN_CONDITIONS_CLASSIC: Record<string, string[]> = {
  ROCK: ['SCISSORS'],
  PAPER: ['ROCK'],
  SCISSORS: ['PAPER'],
};

// Luat mo rong cho chung ket (Rock Paper Scissors Lizard Spock)
export const WIN_CONDITIONS_EXTENDED: Record<string, string[]> = {
  ROCK: ['SCISSORS', 'LIZARD'],
  PAPER: ['ROCK', 'SPOCK'],
  SCISSORS: ['PAPER', 'LIZARD'],
  LIZARD: ['PAPER', 'SPOCK'],
  SPOCK: ['SCISSORS', 'ROCK'],
};
