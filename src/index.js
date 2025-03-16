import http from "http";
import dotenv from "dotenv";
import path from "path";
import app from "./app.js";
import { initSocketServer } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 8080;
const __dirname = path.resolve();

// Create HTTP server using the Express app
const server = http.createServer(app);

// Initialize Socket.IO with the server
const io = initSocketServer(server);

// Start the server
server.listen(PORT, () => {
  console.log("Server is running on PORT:" + PORT);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

export { app, server, io };
