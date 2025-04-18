import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import dotenv from "dotenv";
dotenv.config();

const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

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
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No valid Authorization header found");
      return res.status(401).json({ error: "No token provided" });
    }

    console.log("✓ Authorization header found");
    const token = authHeader.split(" ")[1];
    console.log(`🔑 Token: ${token.substring(0, 10)}...`);

    // Verify token using Cognito public keys via JWKS endpoint
    jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
      if (err) {
        console.log("❌ Token verification failed:", err);
        return res.status(401).json({ error: "Invalid token" });
      }
      console.log(`✅ Token verified successfully for subject: ${decoded.sub}`);

      // Set user info on the request object
      req.user = {
        _id: decoded.sub,
        username: decoded.username || decoded["cognito:username"],
        email: decoded.email,
      };

      console.log("👤 User object created:", req.user);
      console.log("✅ Authentication successful");
      next();
    });
  } catch (error) {
    console.error("❌ Authentication error:");
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    res.status(401).json({ error: "Authentication failed" });
  }
};
