import { Request, Response } from "express";
import { prisma } from "../app";
import { CreateChannelDto } from "../types";

export const channelController = {
  async getChannels(req: Request, res: Response) {
    try {
      const { workspaceId } = req.query;

      if (!workspaceId) {
        res.status(400).json({ error: "Workspace ID is required" });
        return;
      }

      // Check if user is a workspace member
      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspaceId as string,
            userId: req.user.id,
          },
        },
      });

      if (!workspaceMember) {
        res.status(403).json({ error: "Not a member of this workspace" });
        return;
      }

      const channels = await prisma.channel.findMany({
        where: {
          workspaceId: workspaceId as string,
          members: {
            some: {
              userId: req.user.id,
            },
          },
        },
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      });

      res.json(channels);
    } catch (error) {
      console.error("Get channels error:", error);
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  },

  async createChannel(req: Request, res: Response) {
    try {
      const { name, workspaceId, description, isPrivate }: CreateChannelDto =
        req.body;

      // Check if user is a member of the workspace
      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: req.user.id,
          },
        },
      });

      if (!workspaceMember) {
        res.status(403).json({ error: "Not a member of this workspace" });
        return;
      }

      // Create the channel
      const channel = await prisma.channel.create({
        data: {
          name,
          workspaceId,
          description,
          isPrivate: isPrivate || false,
          members: {
            create: {
              userId: req.user.id,
            },
          },
        },
        include: {
          members: true,
        },
      });

      res.status(201).json(channel);
    } catch (error: any) {
      if (error.code === "P2002") {
        res
          .status(400)
          .json({ error: "Channel name already exists in this workspace" });
      } else {
        res.status(400).json({ error: "Failed to create channel" });
      }
    }
  },
};
