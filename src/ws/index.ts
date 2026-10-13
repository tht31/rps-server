import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { redis } from '../queues';
import { logger } from '../utils/logger';

// Map<matchId, Set<WebSocket>> - giu danh sach ket noi dang theo doi tran nao
const matchSubscribers = new Map<string, Set<WebSocket>>();
// WebSocket cua leaderboard broadcast
const leaderboardSubscribers = new Set<WebSocket>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    logger.debug(`WebSocket connected from ${req.socket.remoteAddress}`);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Dang ky theo doi tran dau cu the
        if (msg.type === 'SUBSCRIBE_MATCH' && msg.matchId) {
          if (!matchSubscribers.has(msg.matchId)) {
            matchSubscribers.set(msg.matchId, new Set());
          }
          matchSubscribers.get(msg.matchId)!.add(ws);
          ws.send(JSON.stringify({ type: 'SUBSCRIBED', matchId: msg.matchId }));
        }

        // Dang ky leaderboard live
        if (msg.type === 'SUBSCRIBE_LEADERBOARD') {
          leaderboardSubscribers.add(ws);
          ws.send(JSON.stringify({ type: 'SUBSCRIBED', channel: 'leaderboard' }));
        }
      } catch {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      // Xoa khoi tat ca subscription
      for (const [, subs] of matchSubscribers) subs.delete(ws);
      leaderboardSubscribers.delete(ws);
    });
  });

  // Pub/Sub tu Redis: Worker gui su kien sau moi luot dau
  const subscriber = redis.duplicate();
  subscriber.subscribe('match-events', 'leaderboard-events');

  subscriber.on('message', (channel, message) => {
    if (channel === 'match-events') {
      try {
        const event = JSON.parse(message);
        const subs = matchSubscribers.get(event.matchId);
        if (subs) {
          const payload = JSON.stringify(event);
          for (const ws of subs) {
            if (ws.readyState === WebSocket.OPEN) ws.send(payload);
          }
        }
      } catch (e) {
        logger.error('WebSocket match-event parse error', { e });
      }
    }

    if (channel === 'leaderboard-events') {
      const payload = message;
      for (const ws of leaderboardSubscribers) {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
      }
    }
  });

  logger.info('WebSocket server started at /ws');
  return wss;
}

// Helper: Worker goi ham nay de broadcast tran dau
export function broadcastMatchEvent(matchId: string, event: object) {
  redis.publish('match-events', JSON.stringify({ matchId, ...event }));
}

export function broadcastLeaderboard(data: object) {
  redis.publish('leaderboard-events', JSON.stringify({ type: 'LEADERBOARD_UPDATE', ...data }));
}
