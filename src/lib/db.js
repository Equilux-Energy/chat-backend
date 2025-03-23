import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

console.log("\n📦 Initializing DynamoDB client");
console.log(`⏰ Time: ${new Date().toISOString()}`);

// Validate AWS region
if (!process.env.AWS_REGION) {
  console.error("❌ ERROR: AWS_REGION is not defined in environment variables");
}

// Log configuration details
console.log(`🌐 AWS Region: ${process.env.AWS_REGION || "undefined"}`);
console.log(
  `🔒 Using VPC Endpoint: ${
    process.env.USE_VPC_ENDPOINT === "true" ? "Yes" : "No"
  }`
);

// If using IAM roles (which is preferred in ECS), we don't need to validate credentials
if (process.env.USE_IAM_ROLE !== "true") {
  // Validate credentials only if not using IAM roles
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
}

// Declare dynamoDB at module scope
let dynamoDB;

try {
  // Create configuration for the client
  const clientConfig = {
    region: process.env.AWS_REGION || "eu-west-1", // Fallback region
  };

  // Configure endpoint if using VPC endpoint
  if (process.env.USE_VPC_ENDPOINT === "true") {
    // When using a VPC endpoint, we don't need to specify the URL
    // The AWS SDK will automatically route requests through the VPC endpoint
    // based on the service and region
    console.log("✅ Using VPC Endpoint for DynamoDB access");
  } else {
    console.log("ℹ️ Using standard DynamoDB endpoint over the internet");
  }

  // Add credentials only if not using IAM roles and credentials are provided
  if (process.env.USE_IAM_ROLE !== "true") {
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
  } else {
    console.log(
      "✅ Using IAM role for authentication (recommended for ECS/AWS services)"
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
