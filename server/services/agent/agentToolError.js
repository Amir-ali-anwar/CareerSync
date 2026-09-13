// Typed error every agent tool throws on invalid input or an unmet precondition -
// the executor catches this specifically (see careerWorkflowExecutor.js) to record a
// clean per-step failure (Phase 15's partial-failure handling) instead of letting an
// unexpected exception shape leak into the workflow trace.
class AgentToolError extends Error {
  constructor(action, reason) {
    super(`Career action "${action}" failed: ${reason}`);
    this.name = "AgentToolError";
    this.action = action;
  }
}

export { AgentToolError };
