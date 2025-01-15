import { Request, Response } from "express";
import { prisma } from "../app";

export const messageController = {
  async getMessages(req: Request, res: Response) {
    try {
      const { channelId } = req.query;

      if (!channelId) {
        res.status(400).json({ error: "Channel ID is required" });
        return;
      }

      // Check if user has access to this channel
      const channelMember = await prisma.channelMember.findFirst({
        where: {
          channelId: channelId as string,
          userId: req.user.id,
        },
      });

      if (!channelMember) {
        res.status(403).json({ error: "Not authorized to view this channel" });
        return;
      }

      const messages = await prisma.message.findMany({
        where: {
          channelId: channelId as string,
          threadParentId: null, // Only get top-level messages
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
        orderBy: {
          createdAt: "asc",
        },
      });

      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  },
}; 