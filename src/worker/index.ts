import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

import { MatchJobPayload, MatchResult } from '../types';
import { runMatch } from './umpire';
import { query } from '../db';
import { logger } from '../utils/logger';
import { applyMatchResult } from '../services/swiss';
import { LIMITS } from '../utils/constants';
import fs from 'fs';
import path from 'path';

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const worker = new Worker<MatchJobPayload>(
  'rps-matches',
  async (job: Job<MatchJobPayload>) => {
    const payload = job.data;
    logger.info(`Worker: Processing match ${payload.matchId} [${payload.phase}]`);

    // Danh dau tran dang chay
    await query('UPDATE matches SET status=$1 WHERE id=$2', ['RUNNING', payload.matchId]);

    let result: MatchResult;
    try {
      result = await runMatch(payload);
    } catch (err: any) {
      logger.error(`Worker: Match ${payload.matchId} runner error`, { err: err.message });
      await query('UPDATE matches SET status=$1 WHERE id=$2', ['ERROR', payload.matchId]);
      throw err; // BullMQ se thu lai
    }

    // Luu log tran dau ra file (toi da 1MB)
    const logDir = './storage/logs';
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, `${payload.matchId}.json`);
    const logContent = JSON.stringify(result, null, 2);
    // Gioi han 1MB
    if (Buffer.byteLength(logContent) <= LIMITS.MATCH_LOG_SIZE_BYTES) {
      fs.writeFileSync(logPath, logContent);
    } else {
      // Ghi tat ca tru turns (chi ghi summary)
      const { turns, ...summary } = result;
      fs.writeFileSync(logPath, JSON.stringify({ ...summary, turns_truncated: true }, null, 2));
    }

    // Luu ket qua vao DB
    if (payload.phase !== 'PRACTICE') {
      await applyMatchResult(
        payload.matchId,
        payload.team1Id,
        payload.team2Id,
        result.team1Wins,
        result.team2Wins,
        result.draws,
      );
    } else {
      // Practice: chi cap nhat match record, khong tinh diem Swiss
      await query(
        `UPDATE matches SET team1_wins=$1, team2_wins=$2, draws=$3, winner_id=$4,
         status='DONE', log_file_path=$5, completed_at=NOW() WHERE id=$6`,
        [
          result.team1Wins, result.team2Wins, result.draws,
          result.winnerId,
          logPath,
          payload.matchId,
        ]
      );
    }

    // Pub/Su broadcast qua Redis -> WebSocket server
    await redisConnection.publish('match-events', JSON.stringify({
      type: 'MATCH_DONE',
      matchId: payload.matchId,
      team1Wins: result.team1Wins,
      team2Wins: result.team2Wins,
      draws: result.draws,
      winnerId: result.winnerId,
      phase: payload.phase,
    }));

    // Broadcast leaderboard update sau tran Swiss
    if (payload.phase === 'SWISS' || payload.phase === 'PLAYOFF') {
      await redisConnection.publish('leaderboard-events', JSON.stringify({
        type: 'LEADERBOARD_UPDATE',
        timestamp: new Date().toISOString(),
      }));
    }

    logger.info(`Worker: Match ${payload.matchId} done - Winner: ${result.winnerId ?? 'DRAW'}`);
    return result;
  },
  {
    connection: redisConnection,
    concurrency: LIMITS.MAX_CONCURRENT_MATCHES, // Chay toi da 8 tran song song
  }
);

worker.on('failed', (job, err) => {
  logger.error(`Worker: Job ${job?.id} failed`, { err: err.message, matchId: job?.data.matchId });
});

worker.on('error', (err) => {
  logger.error('Worker error', { err });
});

logger.info(`RPS Match Worker started. Concurrency: ${LIMITS.MAX_CONCURRENT_MATCHES} matches`);
