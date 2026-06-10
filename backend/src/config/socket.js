const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true }
  });

  io.on('connection', (socket) => {
    // Client sends its JWT to join its org room — keeps tenants isolated on sockets too
    socket.on('join-org', (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.join(`org-${decoded.organization_id}`);
      } catch (err) {
        socket.emit('auth-error', 'Invalid or expired token');
      }
    });
  });

  return io;
}

function emitToOrg(orgId, event, data) {
  if (!io) return;
  io.to(`org-${orgId}`).emit(event, data);
}

module.exports = { initSocket, emitToOrg };
