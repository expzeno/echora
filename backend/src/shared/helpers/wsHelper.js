import { WebSocketServer } from 'ws';
import { logger } from '../../lib/logger.js';

const WS_CHANNEL = 'ws:broadcast';

const clients = new Map();
let wss;
let redisPub;
let redisSub;

async function initRedisPubSub() {
  try {
    const { createClient } = await import('redis');
    const opts = { url: process.env.REDIS_URL || 'redis://localhost:6379' };
    redisPub = createClient(opts);
    redisSub = redisPub.duplicate();
    await Promise.all([redisPub.connect(), redisSub.connect()]);
    await redisSub.subscribe(WS_CHANNEL, (message) => {
      try {
        const { customerId, data } = JSON.parse(message);
        deliverLocal(customerId, data);
      } catch {}
    });
    logger.info('[WS] Redis pub/sub connected');
  } catch (err) {
    logger.warn(`[WS] Redis pub/sub unavailable, falling back to local-only: ${err.message}`);
    redisPub = null;
    redisSub = null;
  }
}

function deliverLocal(customerId, data) {
  const set = clients.get(customerId);
  if (!set || set.size === 0) return;
  const msg = typeof data === 'string' ? data : JSON.stringify(data);
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

export const initWebSocket = async (server, authenticateFn) => {
  await initRedisPubSub();

  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (url.pathname !== '/ws') {
        socket.destroy();
        return;
      }

      const token = url.searchParams.get('token');
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const claims = await authenticateFn(token);
      if (!claims) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.customerId = claims.id;
        wss.emit('connection', ws, request);
      });
    } catch (err) {
      logger.error('[WS] Upgrade error:', err.message);
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    const id = ws.customerId;

    if (!clients.has(id)) clients.set(id, new Set());
    clients.get(id).add(ws);

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      const set = clients.get(id);
      if (set) {
        set.delete(ws);
        if (set.size === 0) clients.delete(id);
      }
    });

    ws.on('error', (err) => {
      logger.error(`[WS] Customer ${id} error:`, err.message);
    });
  });

  const heartbeat = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));
};

export const wsSendCustomer = async (customerId, data) => {
  if (redisPub) {
    await redisPub.publish(WS_CHANNEL, JSON.stringify({ customerId, data }));
  } else {
    deliverLocal(customerId, data);
  }
};

export const closeWebSocket = async () => {
  if (redisSub) { try { await redisSub.unsubscribe(WS_CHANNEL); await redisSub.quit(); } catch {} }
  if (redisPub) { try { await redisPub.quit(); } catch {} }
  if (wss) {
    wss.clients.forEach((ws) => ws.close());
    wss.close();
  }
};
