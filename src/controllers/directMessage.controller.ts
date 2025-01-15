import { Request, Response } from "express";
import { prisma } from "../app";

export const directMessageController = {
  async getDirectMessages(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;

      if (!userId) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }

      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { fromId: req.user.id, toId: userId as string },
            { fromId: userId as string, toId: req.user.id },
          ],
        },
        include: {
          from: true,
          to: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch direct messages" });
    }
  },
};
