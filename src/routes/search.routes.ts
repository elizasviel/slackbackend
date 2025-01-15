import { Router } from "express";
import { searchController } from "../controllers/search.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/semantic", authMiddleware, searchController.semanticSearch);

export default router;
