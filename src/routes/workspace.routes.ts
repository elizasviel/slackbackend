import { Router } from "express";
import { workspaceController } from "../controllers/workspace.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, workspaceController.createWorkspace);
router.get("/", authMiddleware, workspaceController.getWorkspaces);
router.post(
  "/:workspaceId/members",
  authMiddleware,
  workspaceController.addMember
);
router.post(
  "/:workspaceId/join",
  authMiddleware,
  workspaceController.joinWorkspace
);

export default router;
