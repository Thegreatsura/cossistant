/**
 * Actions Module
 *
 * Idempotent action executors for AI agent decisions.
 * Each action checks for existing state before executing.
 */

export { assign } from "./assign";
export { categorize } from "./categorize";
export { escalate } from "./escalate";
export { addInternalNote } from "./internal-note";
export { requestHelp } from "./request-help";
export { sendMessage } from "./send-message";
export { updatePriority } from "./update-priority";
export { updateSentiment } from "./update-sentiment";
export { updateStatus } from "./update-status";
export { updateTitle } from "./update-title";
