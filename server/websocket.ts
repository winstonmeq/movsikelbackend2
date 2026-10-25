import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';
import { jwtVerify } from 'jose';

const WS_PORT = Number(process.env.WS_PORT || 4001);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JWT_SECRET = process.env.JWT_SECRET;

const encoder = new TextEncoder();
function getSecret() {
  if (!JWT_SECRET) throw new Error('Missing JWT_SECRET');
  return encoder.encode(JWT_SECRET);
}

async function verifyAuthToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

// Track connections per rideId: Map<rideId, Set<WebSocket>>
const rideRooms = new Map<string, Set<WebSocket>>();
// Track which rideId a socket is listening to: Map<WebSocket, string>
const socketToRide = new Map<WebSocket, string>();

// Dedicated Redis subscriber instance
const redisSub = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisSub.on('error', (err) => {
  console.error('[WS-Redis] Subscriber error:', err.message);
});

// Broadcast Redis Pub/Sub message to all connected clients in the ride room
redisSub.on('message', (channel: string, message: string) => {
  // Channel format: ride:live:<rideId>
  if (!channel.startsWith('ride:live:')) return;
  const rideId = channel.slice('ride:live:'.length);
  const clients = rideRooms.get(rideId);
  if (!clients || clients.size === 0) return;

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
});

function subscribeSocketToRide(ws: WebSocket, rideId: string) {
  // Unsubscribe from previous ride if switching
  const prevRideId = socketToRide.get(ws);
  if (prevRideId && prevRideId !== rideId) {
    unsubscribeSocket(ws);
  }

  socketToRide.set(ws, rideId);
  let room = rideRooms.get(rideId);
  if (!room) {
    room = new Set();
    rideRooms.set(rideId, room);
    // Subscribe Redis to this ride channel
    redisSub.subscribe(`ride:live:${rideId}`).catch((err) => {
      console.error(`[WS] Failed to subscribe Redis channel ride:live:${rideId}:`, err);
    });
  }
  room.add(ws);
}

function unsubscribeSocket(ws: WebSocket) {
  const rideId = socketToRide.get(ws);
  if (!rideId) return;

  socketToRide.delete(ws);
  const room = rideRooms.get(rideId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) {
      rideRooms.delete(rideId);
      // Unsubscribe Redis channel when no clients are left watching this ride
      redisSub.unsubscribe(`ride:live:${rideId}`).catch(() => {});
    }
  }
}

async function startServer() {
  await redisSub.connect().catch((err) => {
    console.warn('[WS] Redis subscriber initial connect warning:', err.message);
  });

  const wss = new WebSocketServer({ port: WS_PORT }, () => {
    console.log(`[WebSocket Server] Running on port ${WS_PORT} (Redis Pub/Sub active)`);
  });

  wss.on('connection', async (ws: WebSocket, req) => {
    // Parse query params: /ws?rideId=...&token=...
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token');
    const initialRideId = url.searchParams.get('rideId');

    // Authenticate token if provided
    if (token) {
      const isValid = await verifyAuthToken(token);
      if (!isValid) {
        ws.send(JSON.stringify({ event: 'error', message: 'Unauthorized: Invalid token' }));
        ws.close(4001, 'Unauthorized');
        return;
      }
    }

    if (initialRideId) {
      subscribeSocketToRide(ws, initialRideId);
      ws.send(JSON.stringify({ event: 'subscribed', rideId: initialRideId }));
    }

    // Handle incoming messages from client (subscribe, ping)
    ws.on('message', async (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        if (payload.action === 'subscribe' && payload.rideId) {
          if (payload.token) {
            const valid = await verifyAuthToken(payload.token);
            if (!valid) {
              ws.send(JSON.stringify({ event: 'error', message: 'Unauthorized' }));
              return;
            }
          }
          subscribeSocketToRide(ws, String(payload.rideId));
          ws.send(JSON.stringify({ event: 'subscribed', rideId: payload.rideId }));
        } else if (payload.action === 'ping') {
          ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
        }
      } catch {
        // Ignore malformed client frames
      }
    });

    ws.on('close', () => {
      unsubscribeSocket(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS Client Error]:', err.message);
      unsubscribeSocket(ws);
    });
  });

  // Keep-alive heartbeat: ping clients every 30s to prune dead mobile connections
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }
  }, 30000);

  function shutdown() {
    console.log('[WebSocket Server] Shutting down...');
    clearInterval(heartbeat);
    redisSub.disconnect();
    wss.close(() => process.exit(0));
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('[WebSocket Server] Fatal startup error:', err);
  process.exit(1);
});
