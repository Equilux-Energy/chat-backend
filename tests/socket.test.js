import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupSocketTest } from "./setup.js";
import { notifyNewMessage } from "../src/services/socket.service.js";

describe("Socket Functionality", () => {
  let testServer;
  let client1, client2;

  beforeAll(() => {
    // Setup test environment
    testServer = setupSocketTest();

    // Create test clients
    client1 = testServer.createClient("user1");
    client2 = testServer.createClient("user2");

    // Wait for connections to establish
    return new Promise((resolve) => {
      let connected = 0;
      const checkDone = () => {
        connected++;
        if (connected === 2) resolve();
      };

      client1.on("connect", checkDone);
      client2.on("connect", checkDone);
    });
  });

  afterAll(async () => {
    // Disconnect clients
    client1.disconnect();
    client2.disconnect();

    // Clean up server
    await testServer.cleanup();
  });

  it("should send and receive message notifications", (done) => {
    // Listen for notification on client2
    client2.on("newMessage", (message) => {
      try {
        expect(message).toBeDefined();
        expect(message.text).toBe("Hello from test");
        expect(message.senderId).toBe("user1");
        expect(message.receiverId).toBe("user2");
        done();
      } catch (error) {
        done(error);
      }
    });

    // Create a test message
    const testMessage = {
      id: "test-msg-1",
      senderId: "user1",
      receiverId: "user2",
      text: "Hello from test",
      createdAt: new Date().toISOString(),
    };

    // Send the notification
    const result = notifyNewMessage("user2", testMessage);

    // Verify the result
    expect(result.success).toBe(true);
    expect(result.socketId).toBeDefined();
  });
});
