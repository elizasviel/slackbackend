import { Router } from "express";
import { messageController } from "../controllers/message.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, messageController.getMessages);

export default router;
