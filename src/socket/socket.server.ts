import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { verifyToken } from "../utils/jwt.utils";
import { prisma } from "../app";
import {
  ThreadReplyData,
  ReactionData,
  Message,
  Reaction,
} from "../types/socket.types";
import { UserStatus } from "@prisma/client";
import { sanitizeHtml } from "../utils/sanitize";
import OpenAI from "openai";
import { Message as PrismaMessage } from "@prisma/client";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const initializeSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          channels: {
            include: {
              channel: true,
            },
          },
        },
      });

      if (!user) {
        return next(new Error("Authentication error"));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    console.log("User connected:", socket.data.user.email);

    // Auto-join user's channels
    const userChannels = socket.data.user.channels;
    userChannels.forEach((membership: any) => {
      socket.join(`channel:${membership.channel.id}`);
      console.log(`Joined channel: ${membership.channel.name}`);
    });

    // Update user status to online
    await prisma.user.update({
      where: { id: socket.data.user.id },
      data: { status: UserStatus.ONLINE },
    });

    // Broadcast user status change
    io.emit("presence:update", {
      userId: socket.data.user.id,
      status: UserStatus.ONLINE,
    });

    socket.on("message:new", async (data) => {
      try {
        const sanitizedContent = sanitizeHtml(data.content);

        // Generate embedding
        const embedding = await openai.embeddings.create({
          input: sanitizedContent,
          model: "text-embedding-3-small",
        });

        // First create the message without the vector
        const message = await prisma.message.create({
          data: {
            content: sanitizedContent,
            channelId: data.channelId,
            userId: socket.data.user.id,
            edited: false,
          },
          include: {
            user: true,
            reactions: true,
            files: true,
          },
        });

        // Then update the vector separately using a raw query
        await prisma.$executeRaw`
          UPDATE messages 
          SET vector = ${embedding.data[0].embedding}::vector 
          WHERE id = ${message.id}
        `;

        io.to(`channel:${data.channelId}`).emit("message:new", message);
      } catch (error) {
        console.error("Error creating message:", error);
        socket.emit("error", "Failed to create message");
      }
    });

    socket.on("thread:reply", async (data: ThreadReplyData) => {
      console.log("New thread reply:", data);

      const message = (await prisma.message.create({
        data: {
          content: data.content,
          channelId: data.channelId,
          userId: socket.data.user.id,
          threadParentId: data.parentId,
        },
        include: {
          user: true,
          parentMessage: true,
        },
      })) as Message;

      io.to(`channel:${data.channelId}`).emit("thread:reply", message);
    });

    socket.on("reaction:add", async (data: ReactionData) => {
      console.log("New reaction:", data);

      try {
        // Check if reaction already exists
        const existingReaction = await prisma.messageReaction.findFirst({
          where: {
            messageId: data.messageId,
            userId: socket.data.user.id,
            emoji: data.emoji,
          },
        });

        if (existingReaction) {
          // If reaction exists, remove it
          await prisma.messageReaction.delete({
            where: {
              id: existingReaction.id,
            },
          });

          io.to(`channel:${data.channelId}`).emit("reaction:removed", {
            messageId: data.messageId,
            reactionId: existingReaction.id,
          });
        } else {
          // If reaction doesn't exist, create it
          const reaction = await prisma.messageReaction.create({
            data: {
              messageId: data.messageId,
              userId: socket.data.user.id,
              emoji: data.emoji,
            },
            include: {
              user: true,
            },
          });

          io.to(`channel:${data.channelId}`).emit("reaction:added", reaction);
        }
      } catch (error) {
        console.error("Error handling reaction:", error);
      }
    });

    socket.on("thread:get", async (messageId: string) => {
      const replies = await prisma.message.findMany({
        where: {
          threadParentId: messageId,
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      socket.emit("thread:replies", replies);
    });

    socket.on("presence:update", async (status: UserStatus) => {
      await prisma.user.update({
        where: { id: socket.data.user.id },
        data: { status },
      });

      io.emit("presence:update", {
        userId: socket.data.user.id,
        status,
      });
    });

    socket.on("dm:send", async (data: { toId: string; content: string }) => {
      const message = await prisma.directMessage.create({
        data: {
          content: data.content,
          fromId: socket.data.user.id,
          toId: data.toId,
        },
        include: {
          from: true,
          to: true,
        },
      });

      // Emit to both sender and receiver
      socket.emit("dm:message", message);
      io.to(`user:${data.toId}`).emit("dm:message", message);
    });

    // Join user's private room for DMs
    socket.join(`user:${socket.data.user.id}`);

    socket.on("disconnect", async () => {
      await prisma.user.update({
        where: { id: socket.data.user.id },
        data: { status: UserStatus.OFFLINE },
      });

      io.emit("presence:update", {
        userId: socket.data.user.id,
        status: UserStatus.OFFLINE,
      });

      console.log("User disconnected:", socket.data.user.email);
    });

    socket.on(
      "file:share",
      async (data: { channelId: string; fileId: string; content?: string }) => {
        const message = await prisma.message.create({
          data: {
            content: data.content || "",
            channelId: data.channelId,
            userId: socket.data.user.id,
            files: {
              connect: {
                id: data.fileId,
              },
            },
          },
          include: {
            user: true,
            files: true,
          },
        });

        io.to(`channel:${data.channelId}`).emit("message:new", message);
      }
    );

    socket.on(
      "message:edit",
      async (data: {
        messageId: string;
        channelId: string;
        content: string;
      }) => {
        try {
          const message = await prisma.message.findUnique({
            where: { id: data.messageId },
            include: { user: true },
          });

          if (!message || message.userId !== socket.data.user.id) {
            return;
          }

          const sanitizedContent = sanitizeHtml(data.content);

          const updatedMessage = await prisma.message.update({
            where: { id: data.messageId },
            data: {
              content: sanitizedContent,
              edited: true,
            },
            include: {
              user: true,
              reactions: {
                include: {
                  user: true,
                },
              },
              files: true,
            },
          });

          io.to(`channel:${data.channelId}`).emit(
            "message:updated",
            updatedMessage
          );
        } catch (error) {
          console.error("Error editing message:", error);
        }
      }
    );

    socket.on(
      "message:delete",
      async (data: { messageId: string; channelId: string }) => {
        try {
          const message = await prisma.message.findUnique({
            where: { id: data.messageId },
            include: { user: true },
          });

          if (!message || message.userId !== socket.data.user.id) {
            return;
          }

          await prisma.message.delete({
            where: { id: data.messageId },
          });

          io.to(`channel:${data.channelId}`).emit("message:deleted", {
            messageId: data.messageId,
          });
        } catch (error) {
          console.error("Error deleting message:", error);
        }
      }
    );

    socket.on("channel:join", async (data: { channelId: string }) => {
      try {
        // Verify user has access to this channel
        const channelMember = await prisma.channelMember.findFirst({
          where: {
            channelId: data.channelId,
            userId: socket.data.user.id,
          },
        });

        if (channelMember) {
          socket.join(`channel:${data.channelId}`);
          console.log(
            `User ${socket.data.user.email} joined channel: ${data.channelId}`
          );
        }
      } catch (error) {
        console.error("Error joining channel:", error);
      }
    });
  });

  return io;
};
