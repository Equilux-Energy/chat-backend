import { Server } from "socket.io";

// Keep track of connected users
let userSocketMap = {}; // {userId: socketId}
let io = null;

/**
 * Initialize Socket.IO server with an existing HTTP server
 * @param {import('http').Server} httpServer - HTTP server to attach Socket.IO to
 * @returns {Server} The Socket.IO server instance
 */
export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap[userId] = socket.id;

    // io.emit() is used to send events to all the connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
      console.log("A user disconnected", socket.id);
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });

  return io;
}

/**
 * Get the socket ID for a specific user
 * @param {string} userId - User ID to look up
 * @returns {string|undefined} Socket ID if found
 */
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

/**
 * Reset socket state (useful for testing)
 */
export function resetSocketState() {
  userSocketMap = {};
}

export { io };
