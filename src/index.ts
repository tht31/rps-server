import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import routes from './routes';
import { setupWebSocket } from './ws';
import { generalLimiter } from './middlewares/rateLimiter';
import { logger } from './utils/logger';
import { pool } from './db';

const PORT = parseInt(process.env.PORT || '4000');

async function bootstrap() {
  // Dam bao thu muc ton tai
  const storagePath = process.env.BOT_STORAGE_PATH || './storage/bots';
  fs.mkdirSync(storagePath, { recursive: true });
  fs.mkdirSync('./logs', { recursive: true });

  // Test ket noi DB
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected OK');
  } catch (err) {
    logger.error('Database connection failed', { err });
    process.exit(1);
  }

  const app = express();
  const server = http.createServer(app);

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
  app.use(generalLimiter);

  // Routes
  app.use('/api', routes);

  // Health check
  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'error', db: 'unreachable' });
    }
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    logger.error('Unhandled error', { err: err.message, stack: err.stack });
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  // WebSocket
  setupWebSocket(server);

  // Start
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`RPS Arena API Server running on http://0.0.0.0:${PORT}`);
    logger.info(`WebSocket live feed at ws://0.0.0.0:${PORT}/ws`);
    logger.info(`Health check at http://0.0.0.0:${PORT}/health`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
