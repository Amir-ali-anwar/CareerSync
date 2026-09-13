import express from "express";
import { getCareerInsights, queryCareerCopilot } from "../controllers/copilotController.js";
import { authorizePermissions } from "../middlewares/permissions.js";

const router = express.Router();

router.get("/insights", authorizePermissions("talent"), getCareerInsights);
router.post("/query", authorizePermissions("talent"), queryCareerCopilot);

export default router;
