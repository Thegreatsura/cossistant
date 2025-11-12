import { Hono } from "hono";
import memberSentMessageWorkflow from "./member-sent-message";
import visitorSentMessageWorkflow from "./visitor-sent-message";
// Workflows
import waitlistWorkflow from "./waitlist";

const workflowsRouters = new Hono();

// Include all workflows below
workflowsRouters.route("/waitlist", waitlistWorkflow);
workflowsRouters.route("/message", memberSentMessageWorkflow);
workflowsRouters.route("/message", visitorSentMessageWorkflow);

export { workflowsRouters };
