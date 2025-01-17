import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get(
  "/summarize/:messageId",
  authMiddleware,
  aiController.summarizeThread
);
router.post("/smart-replies", authMiddleware, aiController.getSmartReplies);

export default router;
