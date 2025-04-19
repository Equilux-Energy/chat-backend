import dynamoDB from "../lib/db.js";
import {
  ScanCommand,
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

// Table names
const USERS_TABLE = process.env.USERS_TABLE;
const MESSAGES_TABLE = process.env.MESSAGES_TABLE;

/**
 * Generate a consistent conversation ID from two user IDs
 * @param {string} userId1
 * @param {string} userId2
 * @returns {string} Conversation ID
 */
export const getConversationId = (userId1, userId2) => {
  // Sort to ensure consistency no matter the order of input
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

export const getUsersExcept = async (userId) => {
  const params = {
    TableName: USERS_TABLE,
    FilterExpression: "username <> :userId", // Changed from "id" to "username"
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    ProjectionExpression: "user_id, username, #status",
    ExpressionAttributeNames: {
      "#status": "status",
    },
  };

  const command = new ScanCommand(params);
  const result = await dynamoDB.send(command);
  return result.Items;
};

export const getMessagesBetweenUsers = async (myId, userToChatId) => {
  // Create a consistent conversation ID
  const conversationId = getConversationId(myId, userToChatId);

  const params = {
    TableName: MESSAGES_TABLE,
    KeyConditionExpression: "conversationId = :conversationId",
    ExpressionAttributeValues: {
      ":conversationId": conversationId,
    },
    // Sort in ascending order by timestamp
    ScanIndexForward: true,
  };

  const result = await dynamoDB.send(new QueryCommand(params));
  return result.Items || [];
};

export const createMessage = async (senderId, receiverId, messageData) => {
  // Determine if we're dealing with a simple text or a complex object
  const isSimpleText = typeof messageData === "string";

  const messageId = uuidv4();
  const timestamp = new Date().toISOString();
  const conversationId = getConversationId(senderId, receiverId);

  const newMessage = {
    messageId,
    conversationId, // New partition key
    timestamp, // New sort key
    senderId,
    receiverId,
    createdAt: timestamp,
    ...(isSimpleText
      ? {
          text: messageData,
          messageType: "text",
        }
      : messageData), // Use the provided object if it's not a simple text
  };

  const params = {
    TableName: MESSAGES_TABLE,
    Item: newMessage,
  };

  await dynamoDB.send(new PutCommand(params));
  return newMessage;
};

/**
 * Update a trade offer's status based on the recipient's response
 * @param {string} messageId - ID of the message/trade offer
 * @param {string} username - Username of the user responding to the offer
 * @param {string} response - Response type: "accept", "reject", or "counter"
 * @param {Object} counterData - Additional data for the counter offer
 * @returns {Promise<Object>} Updated message object
 */
export const updateTradeOfferStatus = async (
  messageId,
  username,
  response,
  counterData
) => {
<<<<<<< HEAD
  try {
    // Get the original message first
    const message = await findMessageById(messageId);

    if (!message) {
      console.error(`❌ Cannot find message with ID ${messageId}`);
      return null;
    }

    // Validate message is a trade offer
    if (message.messageType !== "tradeOffer") {
      console.error(`❌ Message ${messageId} is not a trade offer`);
      return null;
    }

    // Check for permissions (only receiver can respond)
    if (message.receiverId !== username) {
      console.error(
        `❌ User ${username} is not authorized to respond to this offer`
      );
      return null;
    }

    // Check current status allows transitions (only pending offers can be responded to)
    if (message.status !== "pending") {
      console.error(`❌ Cannot respond to offer with status ${message.status}`);
      return null;
    }

    // Now process based on response type
    if (response === "accept") {
      // Accept the offer
      const acceptedOffer = {
        ...message,
        status: "accepted",
        acceptedAt: new Date().toISOString(),
      };

      // Save the updated offer to DynamoDB
      const params = {
        TableName: MESSAGES_TABLE,
        Item: acceptedOffer,
      };

      const command = new PutCommand(params);
      await dynamoDB.send(command);

      return acceptedOffer;
    } else if (response === "reject") {
      // Reject the offer
      const rejectedOffer = {
        ...message,
        status: "rejected",
        rejectedAt: new Date().toISOString(),
      };

      // Save the updated offer to DynamoDB
      const params = {
        TableName: MESSAGES_TABLE,
        Item: rejectedOffer,
      };

      const command = new PutCommand(params);
      await dynamoDB.send(command);

      return rejectedOffer;
    } else if (response === "counter") {
      // Validate counter offer data
      if (!counterData.pricePerUnit || !counterData.totalAmount) {
        console.error(`❌ Missing required counter offer data`);
        return null;
      }

      try {
        // Initialize negotiationHistory if it doesn't exist
        const negotiationHistory = message.negotiationHistory || [];

        // Create counter offer entry
        const counterOfferEntry = {
          userId: username, // Who made this counter
          timestamp: new Date().toISOString(),
          pricePerUnit: counterData.pricePerUnit,
          totalAmount: counterData.totalAmount,
          startTime: counterData.startTime || message.startTime,
          tradeType:
            counterData.tradeType ||
            (message.tradeType === "buy" ? "sell" : "buy"),
          action: "counter",
        };

        // Add this counter to history
        negotiationHistory.push(counterOfferEntry);

        // Update the original offer with negotiation history
        const updatedOffer = {
          ...message,
          status: "negotiating", // New status for ongoing negotiations
          lastUpdated: new Date().toISOString(),
          currentProposal: {
            // The current terms on the table
            pricePerUnit: counterData.pricePerUnit,
            totalAmount: counterData.totalAmount,
            startTime: counterData.startTime || message.startTime,
            tradeType:
              counterData.tradeType ||
              (message.tradeType === "buy" ? "sell" : "buy"),
            proposedBy: username,
          },
          negotiationHistory,
        };

        // Save the updated offer
        const params = {
          TableName: MESSAGES_TABLE,
          Item: updatedOffer,
        };

        const command = new PutCommand(params);
        await dynamoDB.send(command);

        return updatedOffer;
      } catch (dbError) {
        console.error(`❌ DynamoDB error creating counter offer:`, dbError);
        throw dbError;
      }
    } else {
      console.error(`❌ Invalid response type: ${response}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error in updateTradeOfferStatus:`, error);
    throw error;
  }
=======
  // Fetch the original message
  const message = await findMessageById(messageId);

  if (!message) {
    throw new Error("Message not found");
  }

  if (message.messageType !== "tradeOffer") {
    throw new Error("Message is not a trade offer");
  }

  // Verify the responder is the receiver of the trade offer
  if (message.receiverId !== username) {
    throw new Error("User not authorized to respond to this trade offer");
  }

  if (response === "counter") {
    // Create a new counter offer
    const counterOffer = {
      senderId: message.receiverId,
      receiverId: message.senderId,
      text: "Counter offer",
      messageType: "tradeOffer",
      pricePerUnit: counterData.pricePerUnit,
      totalAmount: counterData.totalAmount,
      startTime: counterData.startTime || message.startTime,
      status: "pending",
      originalOfferId: messageId,
      // Toggle trade type if not explicitly provided in counter offer
      tradeType:
        counterData.tradeType || (message.tradeType === "buy" ? "sell" : "buy"),
      // No tradeOfferId yet - this will be generated when accepted
      timestamp: new Date().toISOString(),
    };

    // Save counter offer...
  } else if (response === "accept") {
    // Handle accepted offer
    const originalOfferUpdate = {
      ...message,
      status: "accepted",
      acceptedAt: new Date().toISOString(),
      // Assuming smart contract generates tradeOfferId on acceptance
      // tradeOfferId: counterData.tradeOfferId
    };

    // Update original offer...
  }

  // Rest of the function...
>>>>>>> 8e83e01f642af86f720c0d1a1ab5edc7d4426fb6
};

/**
 * Scan for a message by messageId (less efficient but needed for transition)
 * @param {string} messageId The message ID to look for
 */
export const scanForMessage = async (messageId) => {
  const params = {
    TableName: MESSAGES_TABLE,
    FilterExpression: "messageId = :messageId",
    ExpressionAttributeValues: {
      ":messageId": messageId,
    },
  };

  const result = await dynamoDB.send(new ScanCommand(params));
  return result.Items;
};

/**
 * Find a message by messageId using GSIs for more efficiency
 * Tries both GSI1 and GSI2 to increase chances of finding it quickly
 *
 * @param {string} messageId - The message ID to find
 * @returns {Promise<Object|null>} The message if found, null otherwise
 */
export const findMessageById = async (messageId) => {
  // Try using GSI1 first (most recent messages by senderId)
  const gsi1Params = {
    TableName: MESSAGES_TABLE,
    IndexName: "GSI1", // Your GSI1 name
    FilterExpression: "messageId = :messageId",
    ExpressionAttributeValues: {
      ":messageId": messageId,
    },
    Limit: 1, // We only need one item
  };

  const gsi1Result = await dynamoDB.send(new ScanCommand(gsi1Params));

  if (gsi1Result.Items && gsi1Result.Items.length > 0) {
    return gsi1Result.Items[0];
  }

  // If not found, try using GSI2
  const gsi2Params = {
    TableName: MESSAGES_TABLE,
    IndexName: "GSI2", // Your GSI2 name
    FilterExpression: "messageId = :messageId",
    ExpressionAttributeValues: {
      ":messageId": messageId,
    },
    Limit: 1,
  };

  const gsi2Result = await dynamoDB.send(new ScanCommand(gsi2Params));

  if (gsi2Result.Items && gsi2Result.Items.length > 0) {
    return gsi2Result.Items[0];
  }

  // If still not found, fall back to the existing scan method
  return (await scanForMessage(messageId))[0] || null;
};

/**
 * Get all messages sent by a specific user, sorted by timestamp
 * Uses GSI1: senderId + timestamp
 *
 * @param {string} senderId - ID of the sender
 * @param {number} limit - Maximum number of messages to return
 * @param {Object} lastEvaluatedKey - For pagination
 * @returns {Promise<Object>} Messages and pagination token
 */
export const getMessagesSentByUser = async (
  senderId,
  limit = 20,
  lastEvaluatedKey = null
) => {
  const params = {
    TableName: MESSAGES_TABLE,
    IndexName: "GSI1", // Name of your GSI1
    KeyConditionExpression: "senderId = :senderId",
    ExpressionAttributeValues: {
      ":senderId": senderId,
    },
    ScanIndexForward: false, // Latest messages first
    Limit: limit,
  };

  // Add pagination token if provided
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }

  const result = await dynamoDB.send(new QueryCommand(params));

  return {
    messages: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
};

/**
 * Get all messages received by a specific user, sorted by timestamp
 * Uses GSI2: receiverId + timestamp
 *
 * @param {string} receiverId - ID of the receiver
 * @param {number} limit - Maximum number of messages to return
 * @param {Object} lastEvaluatedKey - For pagination
 * @returns {Promise<Object>} Messages and pagination token
 */
export const getMessagesReceivedByUser = async (
  receiverId,
  limit = 20,
  lastEvaluatedKey = null
) => {
  const params = {
    TableName: MESSAGES_TABLE,
    IndexName: "GSI2", // Name of your GSI2
    KeyConditionExpression: "receiverId = :receiverId",
    ExpressionAttributeValues: {
      ":receiverId": receiverId,
    },
    ScanIndexForward: false, // Latest messages first
    Limit: limit,
  };

  // Add pagination token if provided
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }

  const result = await dynamoDB.send(new QueryCommand(params));

  return {
    messages: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
};

/**
 * Get recent conversations for a user
 * A conversation is defined by the last message between two users
 *
 * @param {string} userId - ID of the user
 * @param {number} limit - Maximum number of conversations to return
 * @returns {Promise<Array>} Array of conversation objects with last message
 */
export const getRecentConversationsForUser = async (userId, limit = 20) => {
  // Get messages where the user is either sender or receiver
  const [sentMessages, receivedMessages] = await Promise.all([
    getMessagesSentByUser(userId, 100), // Get more to find unique conversations
    getMessagesReceivedByUser(userId, 100),
  ]);

  // Combine messages and group by conversation
  const allMessages = [...sentMessages.messages, ...receivedMessages.messages];

  // Group by conversation and keep only the latest message
  const conversations = {};

  allMessages.forEach((message) => {
    const { conversationId, timestamp } = message;

    if (
      !conversations[conversationId] ||
      conversations[conversationId].timestamp < timestamp
    ) {
      // Find the other participant in the conversation
      const otherUserId =
        message.senderId === userId ? message.receiverId : message.senderId;

      conversations[conversationId] = {
        ...message,
        otherUserId,
      };
    }
  });

  // Convert to array, sort by timestamp (newest first), and limit
  return Object.values(conversations)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};

/**
 * Get messages between two users with pagination support
 * Uses the conversationId (primary key) for efficient retrieval
 *
 * @param {string} myId - ID of the current user
 * @param {string} otherUserId - ID of the other user
 * @param {number} limit - Maximum number of messages to return
 * @param {Object} lastEvaluatedKey - For pagination
 * @param {boolean} oldestFirst - If true, return oldest messages first
 * @returns {Promise<Object>} Messages and pagination token
 */
export const getMessagesBetweenUsersPaginated = async (
  myId,
  otherUserId,
  limit = 20,
  lastEvaluatedKey = null,
  oldestFirst = false
) => {
  const conversationId = getConversationId(myId, otherUserId);

  const params = {
    TableName: MESSAGES_TABLE,
    KeyConditionExpression: "conversationId = :conversationId",
    ExpressionAttributeValues: {
      ":conversationId": conversationId,
    },
    ScanIndexForward: oldestFirst, // false for newest first, true for oldest first
    Limit: limit,
  };

  // Add pagination token if provided
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }

  const result = await dynamoDB.send(new QueryCommand(params));

  return {
    messages: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
};

/**
 * Get all trade offers for a user (either as sender or receiver)
 *
 * @param {string} username - Username of the user
 * @param {string} role - "sender" or "receiver" or "both"
 * @param {string} status - Filter by status: "pending", "accept", "reject", "counter", or null for all
 * @param {string} tradeType - Filter by trade type: "buy", "sell", or null for all
 * @returns {Promise<Array>} Array of trade offers
 */
export const getTradeOffersForUser = async (
  username,
  role = "both",
  status,
  tradeType
) => {
  console.log(`Starting getTradeOffersForUser query for ${username}`);

  // Build FilterExpression based on parameters
  let filterExpressions = [];
  let expressionAttributeValues = {
    ":tradeOfferType": "tradeOffer",
  };

<<<<<<< HEAD
  // Initialize ExpressionAttributeNames conditionally
  let expressionAttributeNames = {};

=======
>>>>>>> 8e83e01f642af86f720c0d1a1ab5edc7d4426fb6
  // Handle role filtering (sender or receiver)
  if (role === "sender") {
    filterExpressions.push("senderId = :userId");
    expressionAttributeValues[":userId"] = username;
  } else if (role === "receiver") {
    filterExpressions.push("receiverId = :userId");
    expressionAttributeValues[":userId"] = username;
  } else {
    // Both - user is either sender or receiver
    filterExpressions.push("(senderId = :userId OR receiverId = :userId)");
    expressionAttributeValues[":userId"] = username;
  }

  // Filter by message type (always tradeOffer)
  filterExpressions.push("messageType = :tradeOfferType");

  // Handle status filtering if specified
  if (status) {
    filterExpressions.push("#status = :status");
    expressionAttributeValues[":status"] = status;
<<<<<<< HEAD
    expressionAttributeNames["#status"] = "status"; // Only add when used
=======
>>>>>>> 8e83e01f642af86f720c0d1a1ab5edc7d4426fb6
  }

  // Handle trade type filtering if specified
  if (tradeType && ["buy", "sell"].includes(tradeType)) {
    filterExpressions.push("tradeType = :tradeType");
    expressionAttributeValues[":tradeType"] = tradeType;
  }

  // Combine all filter expressions
  const filterExpression = filterExpressions.join(" AND ");

  // Construct your DynamoDB query params
  const params = {
    TableName: MESSAGES_TABLE,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues,
<<<<<<< HEAD
  };

  // Only add ExpressionAttributeNames if we have any
  if (Object.keys(expressionAttributeNames).length > 0) {
    params.ExpressionAttributeNames = expressionAttributeNames;
  }

=======
    ExpressionAttributeNames: {
      "#status": "status", // status is a reserved word in DynamoDB
    },
  };

>>>>>>> 8e83e01f642af86f720c0d1a1ab5edc7d4426fb6
  // Execute the query
  const command = new ScanCommand(params);
  const result = await dynamoDB.send(command);

  return result.Items || [];
};
