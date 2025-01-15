import express from "express";
import { directMessageController } from "../controllers/directMessage.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authMiddleware, directMessageController.getDirectMessages);

export default router;
