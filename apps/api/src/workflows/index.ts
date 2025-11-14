import { Hono } from "hono";
import messageWorkflow from "./message";
// Workflows
import waitlistWorkflow from "./waitlist";

const workflowsRouters = new Hono();

// Include all workflows below
workflowsRouters.route("/waitlist", waitlistWorkflow);
workflowsRouters.route("/message", messageWorkflow);

export { workflowsRouters };
