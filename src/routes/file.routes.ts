import express, { Request, Response } from "express";
import { upload } from "../middleware/upload.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { prisma } from "../app";

const router = express.Router();

interface FileRequest extends Request {
  file?: Express.Multer.File;
  user?: {
    id: string;
    email: string;
    username: string;
    fullName: string | null;
    status: string;
  };
}

router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req: FileRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const file = await prisma.file.create({
        data: {
          filename: req.file.originalname,
          path: req.file.path,
          mimeType: req.file.mimetype,
          size: req.file.size,
          userId: req.user.id,
        },
      });
      res.json(file);
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(400).json({ error: "Upload failed", details: error.message });
    }
  }
);

export default router;
