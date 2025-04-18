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

    const loggedInUsername = req.user.username;
    console.log("👤 Logged in user ID:", loggedInUsername);

    const commandStart = startTimer();
    const users = await getUsersExcept(loggedInUsername);
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

    const myId = req.user.username; // Use username consistently
    const { id: userToChatId } = req.params;

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

    const myId = req.user.username; // Use username consistently, NOT req.user._id
    const { id: userToChatId } = req.params;

    // Determine message type and validate accordingly
    const {
      text,
      messageType = "text",
      pricePerUnit,
      startTime: tradeStartTime, // Renamed to avoid conflict
      totalAmount,
      tradeType, // New: buy or sell indicator
      tradeOfferId, // New: smart contract generated ID
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
        console.warn("⚠️ Missing start time in trade offer");
        return res.status(400).json({ error: "Start time is required" });
      }

      if (!totalAmount || totalAmount <= 0) {
        console.warn("⚠️ Invalid total amount in trade offer");
        return res
          .status(400)
          .json({ error: "Valid total amount is required" });
      }

      // Validate trade type (buy/sell)
      if (!tradeType || !["buy", "sell"].includes(tradeType)) {
        console.warn("⚠️ Invalid or missing trade type");
        return res
          .status(400)
          .json({ error: "Trade type must be 'buy' or 'sell'" });
      }

      console.log(
        `⚡ Energy trade details: ${tradeType.toUpperCase()} offer, ${pricePerUnit} per unit, ${totalAmount} total, starting at ${tradeStartTime}`
      );

      if (tradeOfferId) {
        console.log(`🔗 Smart contract trade offer ID: ${tradeOfferId}`);
      }
    }

    console.log(
      `📨 Sending ${messageType} message: from ${myId} to ${userToChatId}`
    );

    const dbStart = startTimer();

    let messageData = {
      senderId: myId,
      receiverId: userToChatId,
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
        tradeType, // Add trade type (buy/sell)
        tradeOfferId, // Add smart contract ID if available
      };
    }

    const newMessage = await createMessage(myId, userToChatId, messageData);
    const dbTime = endTimer(dbStart); // This should work correctly now

    console.log(
      `✅ Message saved successfully to DynamoDB in ${dbTime.toFixed(2)}ms`
    );

    // Socket.io notification using the socket service
    console.log("🔍 Sending real-time notification...");
    const socketStart = startTimer();
    const notificationResult = notifyNewMessage(userToChatId, newMessage);
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
  console.log("🔤 Request params:", req.params);
  console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

  try {
    // Authentication checks...

    const { messageId } = req.params;
    const { response } = req.body;

    // Validation checks...

    const username = req.user.username;
    console.log(
      `👤 User ${username} responding to trade offer ${messageId} with: ${response}`
    );

    // First check if the message exists before processing
    const message = await findMessageById(messageId);

    if (!message) {
      console.error(`❌ Trade offer not found: ${messageId}`);
      return res.status(404).json({ error: "Trade offer not found" });
    }

    if (message.messageType !== "tradeOffer") {
      console.error(`❌ Message is not a trade offer: ${messageId}`);
      return res.status(400).json({ error: "Message is not a trade offer" });
    }

    if (message.receiverId !== username) {
      console.error(
        `❌ User ${username} not authorized to respond to offer ${messageId}`
      );
      return res
        .status(403)
        .json({ error: "Not authorized to respond to this trade offer" });
    }

    // Now proceed with updating the trade offer status
    const dbStart = startTimer();
    try {
      const updatedOffer = await updateTradeOfferStatus(
        messageId,
        username,
        response,
        req.body
      );

      if (!updatedOffer) {
        console.error(`❌ Failed to update trade offer ${messageId}`);
        return res.status(500).json({ error: "Failed to update trade offer" });
      }

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
        console.log(
          `✅ Socket notification sent successfully in ${socketTime.toFixed(
            2
          )}ms`
        );
      } else {
        console.log(
          `ℹ️ ${notificationResult.reason || "Notification not sent"}`
        );
      }

      // Send successful response to client
      console.log(`📤 Sending success response with status 200`);
      res.status(200).json(updatedOffer);

      const totalTime = endTimer(startTime);
      console.log(`⏱️ Total execution time: ${totalTime.toFixed(2)}ms`);
    } catch (dbError) {
      console.error("❌ Database error in respondToTradeOffer:");
      console.error("❌ Error name:", dbError.name);
      console.error("❌ Error message:", dbError.message);
      console.error("❌ Error stack:", dbError.stack);
      return res.status(500).json({ error: "Database error occurred" });
    }
  } catch (error) {
    console.error("❌ General error in respondToTradeOffer:");
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    return res.status(500).json({ error: "Internal server error" });
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

    const username = req.user.username;
    const limit = parseInt(req.query.limit) || 20;

    console.log(
      `👤 Getting recent conversations for user: ${username}, limit: ${limit}`
    );

    const queryStart = startTimer();
    const conversations = await getRecentConversationsForUser(username, limit);
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

    const username = req.user.username;
    const { role = "both", status, tradeType } = req.query; // Add tradeType

    console.log(
      `👤 Getting trade offers for user: ${username}, role: ${role}, status: ${
        status || "all"
      }, trade type: ${tradeType || "all"}`
    );

    const queryStart = startTimer();
    const tradeOffers = await getTradeOffersForUser(
      username,
      role,
      status,
      tradeType
    );
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
