import { Request, Response } from "express";
import { prisma } from "../app";
import { CreateWorkspaceDto } from "../types";

export const workspaceController = {
  async createWorkspace(req: Request, res: Response): Promise<void> {
    try {
      const { name, iconUrl } = req.body;

      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "Valid workspace name is required" });
        return;
      }

      const workspace = await prisma.workspace.create({
        data: {
          name,
          iconUrl,
          members: {
            create: {
              userId: req.user.id,
              role: "OWNER",
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

      res.status(201).json(workspace);
    } catch (error) {
      console.error("Create workspace error:", error);
      res.status(400).json({ error: "Failed to create workspace" });
    }
  },

  async getWorkspaces(req: Request, res: Response): Promise<void> {
    try {
      const workspaces = await prisma.workspace.findMany({
        where: {
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
          channels: true,
        },
      });
      res.json(workspaces);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workspaces" });
    }
  },

  async joinWorkspace(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceId } = req.params;

      // Check if workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          channels: {
            where: {
              isPrivate: false,
            },
          },
        },
      });

      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      // Check if user is already a member
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: req.user.id,
          },
        },
      });

      if (existingMember) {
        res.status(400).json({ error: "Already a member of this workspace" });
        return;
      }

      // Add user as a member in a transaction
      const member = await prisma.$transaction(async (prisma) => {
        // Add to workspace
        const workspaceMember = await prisma.workspaceMember.create({
          data: {
            workspaceId,
            userId: req.user.id,
            role: "MEMBER",
          },
        });

        // Add to all public channels
        for (const channel of workspace.channels) {
          await prisma.channelMember.create({
            data: {
              channelId: channel.id,
              userId: req.user.id,
            },
          });
        }

        return workspaceMember;
      });

      res.json(workspace);
    } catch (error) {
      console.error("Join workspace error:", error);
      res.status(500).json({ error: "Failed to join workspace" });
    }
  },

  async addMember(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceId } = req.params;
      const { userId, role = "MEMBER" } = req.body;

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          members: true,
        },
      });

      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      // Check if requester is owner
      const isOwner = workspace.members.some(
        (m) => m.userId === req.user.id && m.role === "OWNER"
      );

      if (!isOwner) {
        res.status(403).json({ error: "Not authorized" });
        return;
      }

      const member = await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          role,
        },
        include: {
          user: true,
        },
      });

      res.status(201).json(member);
    } catch (error) {
      res.status(400).json({ error: "Failed to add member" });
    }
  },
};
