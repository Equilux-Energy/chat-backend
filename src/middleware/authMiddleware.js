import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  console.log("\n🔒 Auth middleware invoked");
  console.log(`🕐 Time: ${new Date().toISOString()}`);
  console.log(`🛣️ URL: ${req.method} ${req.originalUrl || req.url}`);
  console.log(`📋 Headers: ${JSON.stringify(Object.keys(req.headers))}`);

  try {
    // Allow testing with x-test-user-id header in development
    if (
      process.env.NODE_ENV !== "production" &&
      req.headers["x-test-user-id"]
    ) {
      console.log("✅ Using test user ID for development");
      console.log(`👤 Test user ID: ${req.headers["x-test-user-id"]}`);
      req.user = { _id: req.headers["x-test-user-id"] };
      console.log("✅ Auth successful with test user ID");
      return next();
    }

    console.log("🔍 Looking for Authorization header...");
    // Extract the token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No valid Authorization header found");
      console.log(`🧾 Found headers: ${JSON.stringify(req.headers, null, 2)}`);
      return res.status(401).json({ error: "No token provided" });
    }

    console.log("✓ Authorization header found");
    const token = authHeader.split(" ")[1];
    console.log(`🔑 Token: ${token.substring(0, 10)}...`); // Log first 10 chars for debugging

    // For production: You should verify the token with cognito keys
    // For local testing: Just decode without verification
    console.log("🔍 Decoding JWT token...");
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.sub) {
      console.log("❌ Invalid token structure:", decoded);
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log(`✅ Token decoded successfully for subject: ${decoded.sub}`);

    // Set user info on the request object
    req.user = {
      _id: decoded.sub,
      username: decoded.username || decoded["cognito:username"],
      email: decoded.email,
    };

    console.log("👤 User object created:", req.user);
    console.log("✅ Authentication successful");
    next();
  } catch (error) {
    console.error("❌ Authentication error:");
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    res.status(401).json({ error: "Authentication failed" });
  }
};
