import { Request, Response } from "express";
import { prisma } from "../app";
import { generateToken } from "../utils/jwt.utils";
import { LoginDto, AuthResponse } from "../types/auth.types";
import * as crypto from "crypto";

const hashPassword = (password: string) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

export const authController = {
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password }: LoginDto = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || user.password !== hashPassword(password)) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const token = generateToken({ userId: user.id, email: user.email });
      const response: AuthResponse = {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName || undefined,
          status: user.status,
        },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  },

  me: async (req: Request, res: Response): Promise<void> => {
    res.json(req.user);
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { status: "OFFLINE" },
      });
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  },
};
