import mongoose from "mongoose";

// Module J - Phase 20 workflow history. Deliberately bounded and reference-only: this
// never stores raw job/application/profile documents, resume text, or embeddings - only
// ids, titles/company names already surfaced elsewhere in the API, scores, and the
// generated summary text. See MODULE_J_ARCHITECTURE_AUDIT.md Phase 21 for why reads are
// always scoped by `user` rather than by workflow id alone.
const AgentActionPlanItemSchema = new mongoose.Schema(
  {
    priority: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], required: true },
    action: { type: String, required: true },
    reason: { type: String, required: true },
    expectedImpact: { type: String, required: true },
    relatedEntity: {
      type: { type: String },
      id: { type: String, default: null },
    },
  },
  { _id: false }
);

const AgentPlanStepSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    status: { type: String, enum: ["completed", "failed", "skipped"], required: true },
    durationMs: { type: Number, default: 0 },
    error: { type: String, default: null },
  },
  { _id: false }
);

const AgentReferenceSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    id: { type: String, default: null },
  },
  { _id: false }
);

const AgentWorkflowSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    threadId: {
      type: String,
      default: null,
    },
    goal: {
      type: String,
      required: true,
    },
    targetRole: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["COMPLETED", "PARTIAL", "FAILED"],
      required: true,
    },
    plan: {
      type: [AgentPlanStepSchema],
      default: [],
    },
    summary: {
      type: String,
      default: "",
    },
    narrativeSource: {
      type: String,
      enum: ["ai", "deterministic_fallback"],
      default: "deterministic_fallback",
    },
    recommendedActions: {
      type: [AgentActionPlanItemSchema],
      default: [],
    },
    references: {
      type: [AgentReferenceSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Workflow history listing (GET /agent/workflows) always filters by the authenticated
// user and sorts newest-first.
AgentWorkflowSchema.index({ user: 1, createdAt: -1 });
// Agent memory lookup (Phase 13): "most recent workflow for this user+threadId".
AgentWorkflowSchema.index({ user: 1, threadId: 1, createdAt: -1 });

export default mongoose.model("AgentWorkflow", AgentWorkflowSchema);
