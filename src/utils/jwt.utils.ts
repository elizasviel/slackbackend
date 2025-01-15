import jwt from "jsonwebtoken";
import { TokenPayload } from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
