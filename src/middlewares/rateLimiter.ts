import rateLimit from 'express-rate-limit';

// Gioi han chung: 200 req/phut cho moi IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Gioi han nop bot: 2 lan/phut (chong spam)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  message: { error: 'Bot submission limit: 2 per minute' },
});

// Gioi han dang ky doi
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phut
  max: 10,
  message: { error: 'Too many registration attempts' },
});
