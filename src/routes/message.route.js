import express from "express";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
  respondToTradeOffer,
  getConversations,
  getUserTradeOffers,
} from "../controllers/message.controller.js";

const router = express.Router();

// Get users for sidebar
router.get("/users", getUsersForSidebar);

// Get conversations list
router.get("/conversations", getConversations);

// Get trade offers
router.get("/trades", getUserTradeOffers);

// Get messages between current user and another user
router.get("/:id", getMessages);

// Send a message to another user
router.post("/:id", sendMessage);

// Respond to a trade offer
router.post("/trades/:messageId/respond", respondToTradeOffer);

export default router;
