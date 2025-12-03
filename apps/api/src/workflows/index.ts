import { Hono } from "hono";
import aiAgentWorkflow from "./ai-agent";
import messageWorkflow from "./message";

const workflowsRouters = new Hono();

// Include all workflows below
workflowsRouters.route("/message", messageWorkflow);
workflowsRouters.route("/ai-agent", aiAgentWorkflow);

export { workflowsRouters };
