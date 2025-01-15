import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { userController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", authController.login);
router.post("/register", userController.createUser);
router.get("/me", authMiddleware, authController.me);
router.post("/logout", authMiddleware, authController.logout);

export default router;
