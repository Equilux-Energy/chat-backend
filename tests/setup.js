import http from "http";
import { Server } from "socket.io";
import { io as ioc } from "socket.io-client";
import app from "../src/app.js";
import { initSocketServer, resetSocketState } from "../src/lib/socket.js";

/**
 * Create a test server for testing sockets
 * @returns {Object} Object containing server and client utilities
 */
export function setupSocketTest() {
  // Reset any existing socket state
  resetSocketState();

  // Create server
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  const io = initSocketServer(httpServer);

  // Start listening on a random port
  httpServer.listen(0);
  const port = httpServer.address().port;

  // Helper to create test clients
  const createClient = (userId) => {
    return ioc(`http://localhost:${port}`, {
      query: { userId },
      transports: ["websocket"],
      forceNew: true,
    });
  };

  // Helper to close everything
  const cleanup = () => {
    return new Promise((resolve) => {
      httpServer.close(() => {
        resetSocketState();
        resolve();
      });
    });
  };

  return {
    httpServer,
    io,
    port,
    createClient,
    cleanup,
  };
}
