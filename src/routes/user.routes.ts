import express from "express";
import { userController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authMiddleware, userController.getUsers);
router.patch("/profile", authMiddleware, userController.updateProfile);
router.post("/avatar", authMiddleware, userController.updateAvatar);

export default router;
