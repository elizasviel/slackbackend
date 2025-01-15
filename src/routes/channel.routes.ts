import { Router } from "express";
import { channelController } from "../controllers/channel.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, channelController.getChannels);
router.post("/", authMiddleware, channelController.createChannel);

export default router;
