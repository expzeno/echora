import { Server } from 'socket.io';
import { logger } from '../../lib/logger.js';

let io = null;

// ─── Socket.IO gateway ───
// Attaches a Socket.IO server to the given http.Server and wires the core
// agent-dashboard events. Real auth + payloads land in Phase 2 — these are stubs.
export function initGateway(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.ECHORA_CORS_ORIGINS || '*')
        .split(',')
        .map((s) => s.trim()),
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, '[realtime] client connected');

    // Company-wide room: every connected client receives message:new events for
    // all conversations, so unread badges update even for threads not opened.
    socket.join('company:messages');

    // Agent subscribes to a conversation's live updates.
    socket.on('join:conversation', (conversationId) => {
      if (!conversationId) return;
      const room = `conversation:${conversationId}`;
      socket.join(room);
      logger.info({ socketId: socket.id, room }, '[realtime] join:conversation');
      // TODO: verify agent has access to this conversation before joining.
    });

    // Agent marks themselves available for assignment.
    socket.on('agent:online', (agentId) => {
      if (!agentId) return;
      socket.data.agentId = agentId;
      socket.join(`agent:${agentId}`);
      logger.info({ socketId: socket.id, agentId }, '[realtime] agent:online');
      // TODO: update Agent presence + broadcast to supervisors.
    });

    // Agent goes offline.
    socket.on('agent:offline', (agentId) => {
      const id = agentId || socket.data.agentId;
      if (!id) return;
      socket.leave(`agent:${id}`);
      logger.info({ socketId: socket.id, agentId: id }, '[realtime] agent:offline');
      // TODO: update Agent presence + reassign open conversations.
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, '[realtime] client disconnected');
    });
  });

  logger.info('[realtime] Socket.IO gateway initialized');
  return io;
}

// Accessor for other modules (e.g. workers emitting message:new). Returns null
// until initGateway() has run.
export function getIO() {
  return io;
}
