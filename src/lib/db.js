import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

// Load environment variables unconditionally in development
// This ensures they're available before any checks
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
  console.log("📝 Loaded environment variables from .env file");
}

// Now we can check environment values after they're loaded
const isLocalDev =
  process.env.NODE_ENV === "localdev" || process.env.NODE_ENV === "development";

console.log("\n📦 Initializing DynamoDB client");
console.log(`⏰ Time: ${new Date().toISOString()}`);
console.log(`🌐 Environment: ${process.env.NODE_ENV || "production"}`);

// Validate AWS region
if (!process.env.AWS_REGION) {
  console.warn("⚠️ AWS_REGION not defined, using default region");
}

// Log configuration details
console.log(`🌐 AWS Region: ${process.env.AWS_REGION || "eu-west-1"}`);
console.log(`📋 DynamoDB Table: ${process.env.DYNAMODB_TABLE || "undefined"}`);

// Create configuration for the client
const clientConfig = {
  region: process.env.AWS_REGION || "eu-west-1",
};

// When running in ECS, we leverage IAM task roles automatically
// No need to check/use AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY
if (
  isLocalDev &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
) {
  console.log("🔑 Using local dev credentials");
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
} else if (!isLocalDev) {
  console.log("🔒 Using ECS task role for authentication (IAM role)");
}

// In ECS, we'll use VPC endpoints automatically without explicit configuration
// The SDK will route requests properly based on DNS resolution

// Create a variable to hold our DB client
let dbClient;

try {
  console.log("🔄 Creating DynamoDB client");
  const client = new DynamoDBClient(clientConfig);

  dbClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
    },
  });
  console.log("✅ DynamoDB client initialized successfully");
} catch (error) {
  console.error("❌ Error initializing DynamoDB client:", error.message);

  // Create a dummy client that logs errors rather than crashing the app
  dbClient = {
    send: async () => {
      console.error(
        "❌ Attempted to use DynamoDB, but client failed to initialize"
      );
      throw new Error("DynamoDB client failed to initialize");
    },
  };
}

// Export a single default at the top level
export default dbClient;
