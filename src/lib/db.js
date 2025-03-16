import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

console.log("\n📦 Initializing DynamoDB client");
console.log(`⏰ Time: ${new Date().toISOString()}`);

// Validate credentials before attempting to create client
if (!process.env.AWS_ACCESS_KEY_ID) {
  console.error(
    "❌ ERROR: AWS_ACCESS_KEY_ID is not defined in environment variables"
  );
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  console.error(
    "❌ ERROR: AWS_SECRET_ACCESS_KEY is not defined in environment variables"
  );
}
if (!process.env.AWS_REGION) {
  console.error("❌ ERROR: AWS_REGION is not defined in environment variables");
}

// Log configuration details (with credential redaction)
console.log(`🌐 AWS Region: ${process.env.AWS_REGION || "undefined"}`);
console.log(
  `🔑 AWS Access Key ID: ${
    process.env.AWS_ACCESS_KEY_ID
      ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 5)}...`
      : "undefined"
  }`
);
console.log(
  `🔐 AWS Secret Access Key: ${
    process.env.AWS_SECRET_ACCESS_KEY ? "Key exists (redacted)" : "undefined"
  }`
);

// Declare dynamoDB at module scope
let dynamoDB;

try {
  // Create configuration with explicit credentials
  const clientConfig = {
    region: process.env.AWS_REGION || "eu-west-1", // Fallback region
  };

  // Only add credentials if both key and secret are present
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
    console.log("✅ AWS credentials provided explicitly");
  } else {
    console.log(
      "⚠️ No explicit credentials provided, using AWS SDK credential chain"
    );
  }

  console.log(
    "🔄 Creating DynamoDB client with config:",
    JSON.stringify(
      {
        ...clientConfig,
        credentials: clientConfig.credentials ? "REDACTED" : undefined,
      },
      null,
      2
    )
  );

  const client = new DynamoDBClient(clientConfig);
  console.log("✅ DynamoDB client created successfully");

  dynamoDB = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
    },
  });
  console.log("✅ DynamoDB document client initialized successfully");
} catch (error) {
  console.error("❌ Error initializing DynamoDB client:");
  console.error("❌ Error name:", error.name);
  console.error("❌ Error message:", error.message);
  console.error("❌ Error stack:", error.stack);

  // Create a dummy client that throws errors when used
  dynamoDB = {
    send: async () => {
      throw new Error("DynamoDB client failed to initialize");
    },
  };

  // Only throw in development to prevent crashing in production
  if (process.env.NODE_ENV === "development") {
    throw error;
  }
}

export default dynamoDB;
