import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import channelRoutes from "./routes/channel.routes";
import { createServer } from "http";
import { initializeSocketServer } from "./socket/socket.server";
import workspaceRoutes from "./routes/workspace.routes";
import fileRoutes from "./routes/file.routes";
import fs from "fs";
import path from "path";
import messageRoutes from "./routes/message.routes";
import directMessageRoutes from "./routes/directMessage.routes";
import searchRoutes from "./routes/search.routes";
import aiRoutes from "./routes/ai.routes";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);
const io = initializeSocketServer(httpServer);

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/messages/direct", directMessageRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/ai", aiRoutes);
export { prisma };
