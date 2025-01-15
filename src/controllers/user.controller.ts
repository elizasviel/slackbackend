import { Request, Response } from "express";
import { prisma } from "../app";
import * as crypto from "crypto";
import multer from "multer";
import path from "path";
import { generateToken } from "../utils/jwt.utils";

const hashPassword = (password: string) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

const storage = multer.diskStorage({
  destination: "./uploads/avatars",
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
}).single("avatar");

export const userController = {
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password, fullName } = req.body;

      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashPassword(password),
          fullName,
          status: "OFFLINE",
        },
      });

      // Generate token for the new user
      const token = generateToken({ userId: user.id, email: user.email });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.status(201).json({
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Failed to create user" });
    }
  },

  async getUsers(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          status: true,
          avatarUrl: true,
        },
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },

  async updateProfile(req: Request, res: Response) {
    try {
      const { fullName, username } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          fullName,
          username,
        },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          status: true,
          avatarUrl: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: "Failed to update profile" });
    }
  },

  async updateAvatar(req: Request, res: Response) {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      try {
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        const updatedUser = await prisma.user.update({
          where: { id: req.user.id },
          data: { avatarUrl },
          select: {
            id: true,
            email: true,
            username: true,
            fullName: true,
            status: true,
            avatarUrl: true,
          },
        });

        res.json(updatedUser);
      } catch (error) {
        res.status(400).json({ error: "Failed to update avatar" });
      }
    });
  },
};
