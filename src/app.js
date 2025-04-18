import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import messageRoutes from "./routes/message.route.js";
import { authMiddleware } from "./middleware/authMiddleware.js";

// Create and configure the Express app
const app = express();

// API Gateway proxy integration middleware
app.use((req, res, next) => {
  // Handle potential base path from API Gateway
  if (req.path.startsWith("/prod") || req.path.startsWith("/dev")) {
    const parts = req.url.split("/");
    parts.splice(1, 1);
    req.url = parts.join("/");
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

// Single unified CORS configuration
app.use(
  cors({
    // This function handles dynamic origin while supporting credentials
    origin: function (origin, callback) {
      // For Flutter development: allow all origins but respond with the specific origin
      // that made the request to enable credentials
      return callback(null, origin || true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Public endpoints
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Use the authentication middleware for protected routes
app.use("/api", authMiddleware);

// Protected routes
app.use("/api/messages", messageRoutes);

export default app;
