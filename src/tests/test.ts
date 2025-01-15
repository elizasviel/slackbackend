import { io as Client } from "socket.io-client";
import axios from "axios";
import { Message, Reaction } from "../types/socket.types";
import { PrismaClient } from "@prisma/client";

const API_URL = "http://localhost:3000/api";
const SOCKET_URL = "http://localhost:3000";
const prisma = new PrismaClient();

// Add interface for vector query result
interface VectorQueryResult {
  has_vector: boolean;
}

async function test() {
  try {
    // Step 1: Test Authentication
    console.log("Testing Authentication...");

    // Login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: "john@example.com",
      password: "hashedpassword123",
    });

    const token = loginResponse.data.token;
    console.log("✅ Login successful");

    // Test /me endpoint
    const meResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ /me endpoint working");

    // Get workspaces
    const workspacesResponse = await axios.get(`${API_URL}/workspaces`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const workspace = workspacesResponse.data.find(
      (w: any) => w.name === "Acme Corp"
    );

    const channelsResponse = await axios.get(
      `${API_URL}/channels?workspaceId=${workspace.id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const generalChannel = channelsResponse.data.find(
      (c: any) => c.name === "general"
    );

    // Step 2: Test WebSocket
    console.log("\nTesting WebSocket...");

    const socket = Client(SOCKET_URL, {
      auth: { token },
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected");

      // Wait a bit for channel joining
      setTimeout(() => {
        console.log("Sending test message...");
        socket.emit("message:new", {
          channelId: generalChannel.id,
          content:
            "<p><strong>Test</strong> message with <em>formatting</em> and <code>code</code></p>",
        });
      }, 1000);
    });

    socket.on("message:new", (message) => {
      console.log("✅ Message received:", message);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      process.exit(1);
    });

    // Add this after the socket connection setup, before the workspace tests
    console.log("\nTesting Vector Embeddings...");

    // Send a test message
    socket.emit("message:new", {
      channelId: generalChannel.id,
      content: "This is a test message for vector embedding",
    });

    // Wait for the message to be created
    const message = await new Promise<Message>((resolve) => {
      socket.once("message:new", (msg) => resolve(msg));
    });

    // Verify the vector was created
    const vectorResult = await prisma.$queryRaw<VectorQueryResult[]>`
      SELECT vector IS NOT NULL as has_vector 
      FROM messages 
      WHERE id = ${message.id}
    `;

    console.log("✅ Message created with ID:", message.id);
    console.log("✅ Vector embedding present:", vectorResult[0].has_vector);

    // Step 3: Test Workspace Management
    console.log("\nTesting Workspace Management...");

    // Get users to find Jane's ID
    const usersResponse = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const jane = usersResponse.data.find(
      (u: any) => u.email === "jane@example.com"
    );
    console.log("✅ Found Jane's user ID");

    // Create a new workspace
    const newWorkspace = await axios.post(
      `${API_URL}/workspaces`,
      {
        name: "Test Workspace",
        iconUrl: "https://example.com/icon.png",
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Workspace created:", newWorkspace.data.name);

    // Add Jane as a member
    await axios.post(
      `${API_URL}/workspaces/${newWorkspace.data.id}/members`,
      {
        userId: jane.id,
        role: "MEMBER",
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Added member to workspace");

    // Get workspaces
    const workspaces = await axios.get(`${API_URL}/workspaces`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Fetched workspaces:", workspaces.data.length);

    // Step 4: Test Threads and Reactions
    console.log("\nTesting Threads and Reactions...");

    // Send a message that we'll reply to
    socket.emit("message:new", {
      channelId: generalChannel.id,
      content: "Parent message",
    });

    // Wait for the parent message
    const parentMessage = await new Promise<Message>((resolve) => {
      socket.once("message:new", (msg) => resolve(msg));
    });

    // Send a thread reply
    socket.emit("thread:reply", {
      channelId: generalChannel.id,
      parentId: parentMessage.id,
      content:
        "<p>This is a <strong>formatted</strong> thread reply with a <code>code block</code></p>",
    });

    // Add a reaction
    socket.emit("reaction:add", {
      channelId: generalChannel.id,
      messageId: parentMessage.id,
      emoji: "👍",
    });

    // Wait for both events
    await Promise.all([
      new Promise<Message>((resolve) => socket.once("thread:reply", resolve)),
      new Promise<Reaction>((resolve) =>
        socket.once("reaction:added", resolve)
      ),
    ]);

    console.log("✅ Thread reply and reaction added successfully");

    // Add after the thread reply test
    console.log("Testing thread replies fetch...");

    socket.emit("thread:get", parentMessage.id);

    const replies = await new Promise<Message[]>((resolve) => {
      socket.once("thread:replies", resolve);
    });

    console.log("✅ Thread replies fetched:", replies.length);

    // Step 5: Test Presence
    console.log("\nTesting Presence...");

    // Get another socket connection for Jane
    const janeLoginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: "jane@example.com",
      password: "hashedpassword123",
    });

    const janeSocket = Client(SOCKET_URL, {
      auth: { token: janeLoginResponse.data.token },
    });

    // Listen for presence updates
    const presenceUpdates: any[] = [];
    socket.on("presence:update", (update) => {
      presenceUpdates.push(update);
      console.log("✅ Presence update received:", update);
    });

    // Update Jane's status
    janeSocket.emit("presence:update", "AWAY");

    // Wait for presence update
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`✅ Received ${presenceUpdates.length} presence updates`);

    // Step 6: Test Direct Messages
    console.log("\nTesting Direct Messages...");

    // Listen for DM messages
    const dmMessages: any[] = [];
    socket.on("dm:message", (message) => {
      dmMessages.push(message);
      console.log("✅ DM received:", message);
    });

    // Send DM from John to Jane
    socket.emit("dm:send", {
      toId: jane.id,
      content: "Hey Jane, this is a direct message!",
    });

    // Wait for DM
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (dmMessages.length === 0) {
      console.error("❌ No DMs received");
      process.exit(1);
    }

    console.log(`✅ Received ${dmMessages.length} DMs`);

    // Step 7: Test File Uploads
    console.log("\nTesting File Uploads...");

    // Create a test file
    const testFile = Buffer.from("Hello, this is a test file!");
    const formData = new FormData();
    formData.append("file", new Blob([testFile]), "test.txt");

    // Upload file and store response
    let uploadResponse;
    try {
      uploadResponse = await axios.post(`${API_URL}/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("✅ File uploaded successfully:", uploadResponse.data);
    } catch (error: any) {
      console.error("❌ Upload error details:", error.response?.data);
      throw error;
    }

    // Share file in channel
    socket.emit("file:share", {
      channelId: generalChannel.id,
      fileId: uploadResponse.data.id,
      content: "Here's a test file!",
    });

    // Wait for file message
    await new Promise((resolve) => {
      socket.once("message:new", (message) => {
        console.log("✅ File shared in channel:", message.files?.[0].filename);
        resolve(message);
      });
    });

    // Only exit after all tests are complete
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Test failed:", error.response?.data || error.message);
    process.exit(1);
  }
}

test();
