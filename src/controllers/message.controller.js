import dynamoDB from "../lib/db.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { v4 as uuidv4 } from "uuid"; // You may need to install this: npm install uuid

// Table names - make sure these match your DynamoDB tables
const USERS_TABLE = "Users";
const MESSAGES_TABLE = "Messages";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const params = {
      TableName: USERS_TABLE,
      FilterExpression: "id <> :userId",
      ExpressionAttributeValues: {
        ":userId": loggedInUserId,
      },
      ProjectionExpression: "id, username, #status", // Exclude password
      ExpressionAttributeNames: {
        "#status": "status", // status is a reserved word in DynamoDB
      },
    };

    const result = await dynamoDB.scan(params).promise();

    res.status(200).json(result.Items);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Since DynamoDB doesn't support OR queries directly, we need to do two separate queries
    const sentMessagesParams = {
      TableName: MESSAGES_TABLE,
      FilterExpression: "senderId = :senderId AND receiverId = :receiverId",
      ExpressionAttributeValues: {
        ":senderId": myId,
        ":receiverId": userToChatId,
      },
    };

    const receivedMessagesParams = {
      TableName: MESSAGES_TABLE,
      FilterExpression: "senderId = :senderId AND receiverId = :receiverId",
      ExpressionAttributeValues: {
        ":senderId": userToChatId,
        ":receiverId": myId,
      },
    };

    // Execute both queries in parallel
    const [sentMessages, receivedMessages] = await Promise.all([
      dynamoDB.scan(sentMessagesParams).promise(),
      dynamoDB.scan(receivedMessagesParams).promise(),
    ]);

    // Combine and sort messages by timestamp
    const allMessages = [...sentMessages.Items, ...receivedMessages.Items].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    res.status(200).json(allMessages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text } = req.body; // Only get text, no image
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Create a new message object
    const newMessage = {
      id: uuidv4(), // Generate a unique ID
      senderId,
      receiverId,
      text,
      createdAt: new Date().toISOString(),
      // No image field
    };

    // Save to DynamoDB
    const params = {
      TableName: MESSAGES_TABLE,
      Item: newMessage,
    };

    await dynamoDB.put(params).promise();

    // Send real-time notification if user is online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
