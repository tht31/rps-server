import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { MatchJobPayload } from '../types';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

// Redis client chinh - Pub/Sub va cache
export const redis = new Redis(redisConnection);

// Redis client thu 2 danh rieng cho BullMQ (BullMQ can client khong dung lenh SUBSCRIBE)
export const redisBullMQ = new Redis({
  ...redisConnection,
  maxRetriesPerRequest: null, // Bat buoc cho BullMQ
});

// ============================================================
// Match Queue - Hang doi tran dau voi 3 muc uu tien
// ============================================================
// Priority: 1 = cao nhat (chinh thuc Swiss/Playoff)
//           5 = kiem tra cu phap
//           10 = luyen tap
export const matchQueue = new Queue<MatchJobPayload>('rps-matches', {
  connection: redisBullMQ,
  defaultJobOptions: {
    attempts: 2, // Thu lai 1 lan neu worker gap loi ha tang
    backoff: { type: 'fixed', delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 500,
  },
});

// Helper: dua tran dau vao hang doi
export async function enqueueMatch(payload: MatchJobPayload, priority: 1 | 5 | 10 = 5) {
  return matchQueue.add('run-match', payload, { priority });
}
