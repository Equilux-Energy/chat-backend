import dynamoDB from "../lib/db.js";
import {
  ScanCommand,
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

// Table names
const USERS_TABLE = "Equilux_Users_Prosumers";
const MESSAGES_TABLE = "Equilux_Messages";

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
    FilterExpression: "id <> :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    ProjectionExpression: "id, username, #status",
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
 * @param {string} responderId - ID of the user responding to the offer
 * @param {string} response - Response type: "accept", "reject", or "counter"
 * @param {Object} responseData - Additional data for the response
 * @returns {Promise<Object>} Updated message object
 */
export const updateTradeOfferStatus = async (
  messageId,
  responderId,
  response,
  responseData = {}
) => {
  // Use the improved findMessageById function
  const message = await findMessageById(messageId);

  if (!message) {
    throw new Error("Message not found");
  }

  if (message.messageType !== "tradeOffer") {
    throw new Error("Message is not a trade offer");
  }

  // Verify the responder is the receiver of the trade offer
  if (message.receiverId !== responderId) {
    throw new Error("User not authorized to respond to this trade offer");
  }

  // Prepare update based on response type
  let updateExpression =
    "SET #status = :status, updatedAt = :updatedAt, responseTimestamp = :responseTimestamp";
  let expressionAttributeNames = { "#status": "status" };
  let expressionAttributeValues = {
    ":status": response,
    ":updatedAt": new Date().toISOString(),
    ":responseTimestamp": new Date().toISOString(),
  };

  // Add additional fields for counter offers
  if (response === "counter") {
    // Validate counter offer data
    if (!responseData.pricePerUnit || responseData.pricePerUnit <= 0) {
      throw new Error("Counter offer requires valid price per unit");
    }
    if (!responseData.totalAmount || responseData.totalAmount <= 0) {
      throw new Error("Counter offer requires valid total amount");
    }

    updateExpression += ", counterOffer = :counterOffer";
    expressionAttributeValues[":counterOffer"] = {
      pricePerUnit: responseData.pricePerUnit,
      totalAmount: responseData.totalAmount,
      startTime: responseData.startTime || message.startTime,
    };
  }

  const updateParams = {
    TableName: MESSAGES_TABLE,
    Key: {
      conversationId: message.conversationId,
      timestamp: message.timestamp,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  const { Attributes: updatedMessage } = await dynamoDB.send(
    new UpdateCommand(updateParams)
  );
  return updatedMessage;
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
    IndexName: "senderId-timestamp-index", // Your GSI1 name
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
    IndexName: "receiverId-timestamp-index", // Your GSI2 name
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
    IndexName: "senderId-timestamp-index", // Name of your GSI1
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
    IndexName: "receiverId-timestamp-index", // Name of your GSI2
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
 * @param {string} userId - ID of the user
 * @param {string} role - "sender" or "receiver" or "both"
 * @param {string} status - Filter by status: "pending", "accept", "reject", "counter", or null for all
 * @returns {Promise<Array>} Array of trade offers
 */
export const getTradeOffersForUser = async (userId, role = "both", status = null) => {
  let allOffers = [];
  
  // Get offers where user is the sender
  if (role === "sender" || role === "both") {
    const params = {
      TableName: MESSAGES_TABLE,
      IndexName: "senderId-timestamp-index",
      KeyConditionExpression: "senderId = :userId",
      FilterExpression: "messageType = :messageType",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":messageType": "tradeOffer"
      }
    };
    
    // Add status filter if specified
    if (status) {
      params.FilterExpression += " AND #status = :status";
      params.ExpressionAttributeValues[":status"] = status;
      if (!params.ExpressionAttributeNames) params.ExpressionAttributeNames = {};
      params.ExpressionAttributeNames["#status"] = "status";
    }
    
    const result = await dynamoDB.send(new QueryCommand(params));
    if (result.Items?.length) {
      allOffers = allOffers.concat(result.Items);
    }
  }
  
  // Get offers where user is the receiver
  if (role === "receiver" || role === "both") {
    const params = {
      TableName: MESSAGES_TABLE,
      IndexName: "receiverId-timestamp-index",
      KeyConditionExpression: "receiverId = :userId",
      FilterExpression: "messageType = :messageType",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":messageType": "tradeOffer"
      }
    };
    
    // Add status filter if specified
    if (status) {
      params.FilterExpression += " AND #status = :status";
      params.ExpressionAttributeValues[":status"] = status;
      if (!params.ExpressionAttributeNames) params.ExpressionAttributeNames = {};
      params.ExpressionAttributeNames["#status"] = "status";
    }
    
    const result = await dynamoDB.send(new QueryCommand(params));
    if (result.Items?.length) {
      allOffers = allOffers.concat(result.Items);
    }
  }
  
  // Sort by timestamp (newest first)
  return allOffers.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};
