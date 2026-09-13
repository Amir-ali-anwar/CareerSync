import express from "express";
import { executeAgentWorkflow, getAgentWorkflow, listAgentWorkflows } from "../controllers/agentController.js";
import { authorizePermissions } from "../middlewares/permissions.js";
import { agentExecutionLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/execute", authorizePermissions("talent"), agentExecutionLimiter, executeAgentWorkflow);
router.get("/workflows", authorizePermissions("talent"), listAgentWorkflows);
router.get("/workflows/:workflowId", authorizePermissions("talent"), getAgentWorkflow);

export default router;
