import { getReceiverSocketId, io } from "../lib/socket.js";

/**
 * Notify a user about a new message
 * @param {string} receiverId - ID of the user to notify
 * @param {Object} message - Message data
 * @returns {Object} - Result object with success status
 */
export function notifyNewMessage(receiverId, message) {
  try {
    const receiverSocketId = getReceiverSocketId(receiverId);

    if (!receiverSocketId) {
      return {
        success: false,
        socketId: null,
        reason: "Recipient not connected",
      };
    }

    io.to(receiverSocketId).emit("newMessage", message);

    return {
      success: true,
      socketId: receiverSocketId,
      delivered: true,
    };
  } catch (error) {
    console.error("Socket notification error:", error);
    return {
      success: false,
      error: error.message,
      reason: "Socket error occurred",
    };
  }
}

/**
 * Notify the original sender about a trade offer response
 * @param {string} userId - ID of the user to notify (original sender)
 * @param {Object} updatedOffer - Updated trade offer data
 * @returns {Object} - Result object with success status
 */
export function notifyTradeResponse(userId, updatedOffer) {
  try {
    const socketId = getReceiverSocketId(userId);

    if (!socketId) {
      return {
        success: false,
        reason: "User not connected",
      };
    }

    io.to(socketId).emit("tradeResponse", updatedOffer);

    return {
      success: true,
      socketId,
      delivered: true,
    };
  } catch (error) {
    console.error("Trade response notification error:", error);
    return {
      success: false,
      error: error.message,
      reason: "Socket error occurred",
    };
  }
}
