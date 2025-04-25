import { getReceiverSocketId, io } from "../lib/socket.js";
import {
  getUsersExcept,
  getMessagesBetweenUsersPaginated,
  getMessagesBetweenUsers,
  createMessage,
  getRecentConversationsForUser,
  getTradeOffersForUser,
  findMessageById,
  updateTradeOfferStatus,
} from "../services/message.service.js";
import {
  notifyNewMessage,
  notifyTradeResponse,
} from "../services/socket.service.js";

// Helper for performance logging
const startTimer = () => {
  return process.hrtime();
};

const endTimer = (start) => {
  const diff = process.hrtime(start);
  return (diff[0] * 1e9 + diff[1]) / 1e6; // Return time in milliseconds
};

export const getUsersForSidebar = async (req, res) => {
  const startTime = startTimer();
  console.log("\n🔍 getUsersForSidebar called");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🔑 Request headers:", JSON.stringify(req.headers, null, 2));
  console.log("🌐 Client IP:", req.ip || req.connection.remoteAddress);

  try {
    console.log("⏳ Starting user retrieval process...");

    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      console.error("❌ Authentication failed: No user object or user ID");
      return res.status(401).json({ error: "User not authenticated" });
    }

    const loggedInUserId = req.user._id;
    console.log("👤 Logged in user ID:", loggedInUserId);

    const commandStart = startTimer();
    const users = await getUsersExcept(loggedInUserId);
    const queryTime = endTimer(commandStart);

    console.log(`✅ User query completed in ${queryTime.toFixed(2)}ms`);
    console.log(`📊 Found ${users?.length || 0} users`);

    if (users?.length > 0) {
      console.log(
        "👥 First few users:",
        JSON.stringify(users.slice(0, 3), null, 2)
      );
    } else {
      console.log("⚠️ No users found");
    }

    console.log("📤 Sending response with status 200");
    res.status(200).json(users);

    const totalTime = endTimer(startTime);
    console.log(`⏱️ Total execution time: ${totalTime.toFixed(2)}ms`);
  } catch (error) {
    console.error("❌ Error in getUsersForSidebar:");
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ AWS Error code:", error.code);
    console.error("❌ AWS Request ID:", error.$metadata?.requestId);
    console.log("📤 Sending error response with status 500");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  const startTime = startTimer();
  console.log("\n🔍 getMessages called");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🔑 Request headers:", JSON.stringify(req.headers, null, 2));
  console.log("🔤 Request params:", req.params);
  console.log("🌐 Client IP:", req.ip || req.connection.remoteAddress);

  try {
    console.log("⏳ Starting message retrieval process...");

    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      console.error("❌ Authentication failed: No user object or user ID");
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Validate recipient ID
    if (!req.params.id) {
      console.error("❌ Missing recipient ID in URL parameters");
      return res.status(400).json({ error: "Recipient ID is required" });
    }

    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Get pagination parameters from query string
    const limit = parseInt(req.query.limit) || 20;
    const lastEvaluatedKey = req.query.lastEvaluatedKey
      ? JSON.parse(Buffer.from(req.query.lastEvaluatedKey, "base64").toString())
      : null;
    const oldestFirst = req.query.oldestFirst === "true";

    console.log(
      `👥 Getting messages between users: ${myId} and ${userToChatId} (limit: ${limit}, oldest first: ${oldestFirst})`
    );

    const queryStart = startTimer();

    // Use the new paginated function
    const result = await getMessagesBetweenUsersPaginated(
      myId,
      userToChatId,
      limit,
      lastEvaluatedKey,
      oldestFirst
    );

    const queryTime = endTimer(queryStart);

    console.log(`✅ Message query completed in ${queryTime.toFixed(2)}ms`);
    console.log(`📊 Total messages retrieved: ${result.messages.length}`);

    // Prepare pagination token if there are more results
    let nextPageToken = null;
    if (result.lastEvaluatedKey) {
      nextPageToken = Buffer.from(
        JSON.stringify(result.lastEvaluatedKey)
      ).toString("base64");

      console.log("📄 More messages available, pagination token created");
    }

    if (result.messages.length > 0) {
      console.log(
        "💬 First message:",
        JSON.stringify(result.messages[0], null, 2)
      );
      console.log(
        "💬 Last message:",
        JSON.stringify(result.messages[result.messages.length - 1], null, 2)
      );
    }

    console.log("📤 Sending response with status 200");
    res.status(200).json({
      messages: result.messages,
      nextPageToken,
    });

    const totalTime = endTimer(startTime);
    console.log(`⏱️ Total execution time: ${totalTime.toFixed(2)}ms`);
  } catch (error) {
    console.error("❌ Error in getMessages:");
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ AWS Error code:", error.code);
    console.error("❌ AWS Request ID:", error.$metadata?.requestId);
    console.log("📤 Sending error response with status 500");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  // Rename to avoid conflict with request body parameter
  const functionStartTime = startTimer();
  console.log("\n🔍 sendMessage called");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🔑 Request headers:", JSON.stringify(req.headers, null, 2));
  console.log("🔤 Request params:", req.params);
  console.log("📦 Request body:", JSON.stringify(req.body, null, 2));
  console.log("🌐 Client IP:", req.ip || req.connection.remoteAddress);

  try {
    console.log("⏳ Starting message sending process...");

    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      console.error("❌ Authentication failed: No user object or user ID");
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Validate recipient ID
    if (!req.params.id) {
      console.error("❌ Missing recipient ID in URL parameters");
      return res.status(400).json({ error: "Recipient ID is required" });
    }

    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Determine message type and validate accordingly
    const {
      text,
      messageType = "text",
      pricePerUnit,
      startTime: tradeStartTime, // Rename to avoid conflict
      totalAmount,
    } = req.body;

    // Common validation for all message types
    if (!text && messageType === "text") {
      console.warn("⚠️ No message text provided for text message");
      return res.status(400).json({ error: "Message text is required" });
    }

    // Specific validation for energy trade offers
    if (messageType === "tradeOffer") {
      console.log("📊 Processing energy trade offer");

      // Validate required trade offer fields
      if (!pricePerUnit || pricePerUnit <= 0) {
        console.warn("⚠️ Invalid price per unit in trade offer");
        return res
          .status(400)
          .json({ error: "Valid price per unit is required" });
      }

      if (!tradeStartTime) {
        // Use renamed variable
        console.warn("⚠️ Missing start time in trade offer");
        return res.status(400).json({ error: "Start time is required" });
      }

      if (!totalAmount || totalAmount <= 0) {
        console.warn("⚠️ Invalid total amount in trade offer");
        return res
          .status(400)
          .json({ error: "Valid total amount is required" });
      }

      console.log(
        `⚡ Energy trade details: ${pricePerUnit} per unit, ${totalAmount} total, starting at ${tradeStartTime}`
      );
    }

    console.log(
      `📨 Sending ${messageType} message: from ${senderId} to ${receiverId}`
    );

    const dbStart = startTimer();

    let messageData = {
      senderId,
      receiverId,
      text,
      messageType,
    };

    // Add trade-specific fields if this is a trade offer
    if (messageType === "tradeOffer") {
      messageData = {
        ...messageData,
        pricePerUnit,
        startTime: tradeStartTime, // Use renamed variable
        totalAmount,
        status: "pending", // Initial status for trade offers
      };
    }

    const newMessage = await createMessage(senderId, receiverId, messageData);
    const dbTime = endTimer(dbStart); // This should work correctly now

    console.log(
      `✅ Message saved successfully to DynamoDB in ${dbTime.toFixed(2)}ms`
    );

    // Socket.io notification using the socket service
    console.log("🔍 Sending real-time notification...");
    const socketStart = startTimer();
    const notificationResult = notifyNewMessage(receiverId, newMessage);
    const socketTime = endTimer(socketStart);

    if (notificationResult.success) {
      console.log(
        `✅ Socket.io notification sent successfully to socket: ${notificationResult.socketId}`
      );
    } else {
      console.log(`ℹ️ ${notificationResult.reason || "Notification not sent"}`);
    }

    console.log(`⏱️ Socket operations completed in ${socketTime.toFixed(2)}ms`);

    console.log("📤 Sending success response with status 201");
    res.status(201).json(newMessage);

    const totalTime = endTimer(functionStartTime); // Use renamed variable
    console.log(`⏱️ Total execution time: ${totalTime.toFixed(2)}ms\n`);
  } catch (error) {
    console.error("❌ Error in sendMessage:");
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ AWS Error code:", error.code);
    console.error("❌ AWS Request ID:", error.$metadata?.requestId);
    console.log("📤 Sending error response with status 500");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const respondToTradeOffer = async (req, res) => {
  const startTime = startTimer();
  console.log("\n🔍 respondToTradeOffer called");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🔑 Request headers:", JSON.stringify(req.headers, null, 2));
  console.log("🔤 Request params:", req.params);
  console.log("📦 Request body:", JSON.stringify(req.body, null, 2));
  console.log("🌐 Client IP:", req.ip || req.connection.remoteAddress);

  try {
    console.log("⏳ Starting trade offer response process...");

    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      console.error("❌ Authentication failed: No user object or user ID");
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { messageId } = req.params;
    const { response } = req.body;

    if (!messageId) {
      console.error("❌ Missing message ID in URL parameters");
      return res.status(400).json({ error: "Message ID is required" });
    }

    if (!response || !["accept", "reject", "counter"].includes(response)) {
      console.warn("⚠️ Invalid trade response");
      return res
        .status(400)
        .json({ error: "Valid response (accept/reject/counter) is required" });
    }

    // Additional validation for counter offers
    if (response === "counter") {
      const { pricePerUnit, totalAmount } = req.body;

      if (!pricePerUnit || pricePerUnit <= 0) {
        console.warn("⚠️ Invalid price per unit in counter offer");
        return res.status(400).json({
          error: "Valid price per unit is required for counter offers",
        });
      }

      if (!totalAmount || totalAmount <= 0) {
        console.warn("⚠️ Invalid total amount in counter offer");
        return res
          .status(400)
          .json({ error: "Valid total amount is required for counter offers" });
      }
    }

    const userId = req.user._id;
    console.log(
      `👤 User ${userId} responding to trade offer ${messageId} with: ${response}`
    );

    // Update the trade offer status using our optimized function
    const dbStart = startTimer();

    try {
      const updatedOffer = await updateTradeOfferStatus(
        messageId,
        userId,
        response,
        req.body
      );

      const dbTime = endTimer(dbStart);
      console.log(
        `✅ Trade offer updated in DynamoDB in ${dbTime.toFixed(2)}ms`
      );

      // Notify the original sender about the response
      console.log("🔍 Sending response notification...");
      const socketStart = startTimer();

      const notificationResult = notifyTradeResponse(
        updatedOffer.senderId,
        updatedOffer
      );

      const socketTime = endTimer(socketStart);

      if (notificationResult.success) {
        console.log(`✅ Trade response notification sent successfully`);
      } else {
        console.log(
          `ℹ️ ${notificationResult.reason || "Notification not sent"}`
        );
      }

      console.log(
        `⏱️ Socket operations completed in ${socketTime.toFixed(2)}ms`
      );

      console.log("📤 Sending success response with status 200");
      res.status(200).json(updatedOffer);
    } catch (dbError) {
      // Handle specific database errors
      if (dbError.message === "Message not found") {
        console.error("❌ Trade offer not found:", messageId);
        return res.status(404).json({ error: "Trade offer not found" });
      }

      if (dbError.message === "Message is not a trade offer") {
        console.error("❌ Message is not a trade offer:", messageId);
        return res.status(400).json({ error: "Message is not a trade offer" });
      }

      if (
        dbError.message === "User not authorized to respond to this trade offer"
      ) {
        console.error("❌ User not authorized:", userId);
        return res
          .status(403)
          .json({ error: "Not authorized to respond to this trade offer" });
      }

      // Re-throw other errors to be caught by the outer catch block
      throw dbError;
    }

    const totalTime = endTimer(startTime);
    console.log(`⏱️ Total execution time: ${totalTime.toFixed(2)}ms\n`);
  } catch (error) {
    console.error("❌ Error in respondToTradeOffer:");
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ AWS Error code:", error.code);
    console.error("❌ AWS Request ID:", error.$metadata?.requestId);
    console.log("📤 Sending error response with status 500");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getConversations = async (req, res) => {
  const startTime = startTimer();
  console.log("\n🔍 getConversations called");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🔑 Request headers:", JSON.stringify(req.headers, null, 2));
  console.log("🌐 Client IP:", req.ip || req.connection.remoteAddress);

  try {
    console.log("⏳ Starting conversations retrieval process...");

    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      console.error("❌ Authentication failed: No user object or user ID");
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 20;

    console.log(
      `👤 Getting recent conversations for user: ${userId}, limit: ${limit}`
    );

    const queryStart = startTimer();
    const conversations = await getRecentConversationsForUser(userId, limit);
    const queryTime = endTimer(queryStart);

    console.log(
      `✅ Conversations query completed in ${queryTime.toFixed(2)}ms`
    );
    console.log(`📊 Total conversations: ${conversations.length}`);

    if (conversations.length > 0) {
      console.log(
        "💬 First conversation:",
        JSON.stringify(conversations[0], null, 2)
      );
    } else {
      console.log("⚠️ No conversations found");
    }

    console.log("📤 Sending response with status 200");
    res.status(200).json(conversations);

    const totalTime = endTimer(startTime);
    console.log(`⏱️ Total execution time: ${totalTime.toFixed(2)}ms`);
  } catch (error) {
    console.error("❌ Error in getConversations:");
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ AWS Error code:", error.code);
    console.error("❌ AWS Request ID:", error.$metadata?.requestId);
    console.log("📤 Sending error response with status 500");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserTradeOffers = async (req, res) => {
  const startTime = startTimer();
  console.log("\n🔍 getUserTradeOffers called");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🔑 Request headers:", JSON.stringify(req.headers, null, 2));
  console.log("🔤 Request query:", req.query);
  console.log("🌐 Client IP:", req.ip || req.connection.remoteAddress);

  try {
    console.log("⏳ Starting trade offers retrieval process...");

    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      console.error("❌ Authentication failed: No user object or user ID");
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userId = req.user._id;
    const { role = "both", status } = req.query;

    console.log(
      `👤 Getting trade offers for user: ${userId}, role: ${role}, status: ${
        status || "all"
      }`
    );

    const queryStart = startTimer();
    const tradeOffers = await getTradeOffersForUser(userId, role, status);
    const queryTime = endTimer(queryStart);

    console.log(`✅ Trade offers query completed in ${queryTime.toFixed(2)}ms`);
    console.log(`📊 Total trade offers: ${tradeOffers.length}`);

    if (tradeOffers.length > 0) {
      console.log(
        "💬 First trade offer:",
        JSON.stringify(tradeOffers[0], null, 2)
      );
    } else {
      console.log("⚠️ No trade offers found");
    }

    console.log("📤 Sending response with status 200");
    res.status(200).json(tradeOffers);

    const totalTime = endTimer(startTime);
    console.log(`⏱️ Total execution time: ${totalTime.toFixed(2)}ms`);
  } catch (error) {
    console.error("❌ Error in getUserTradeOffers:");
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ AWS Error code:", error.code);
    console.error("❌ AWS Request ID:", error.$metadata?.requestId);
    console.log("📤 Sending error response with status 500");
    res.status(500).json({ error: "Internal server error" });
  }
};
