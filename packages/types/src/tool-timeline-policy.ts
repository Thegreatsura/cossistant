export const TOOL_TIMELINE_LOG_TYPE = {
	CUSTOMER_FACING: "customer_facing",
	LOG: "log",
	DECISION: "decision",
} as const;

export type ToolTimelineLogType =
	(typeof TOOL_TIMELINE_LOG_TYPE)[keyof typeof TOOL_TIMELINE_LOG_TYPE];

export const TOOL_TIMELINE_CONVERSATION_ALLOWLIST = [
	"searchKnowledgeBase",
	"updateConversationTitle",
	"updateSentiment",
] as const;

const CONVERSATION_VISIBLE_TOOLS = new Set<string>(
	TOOL_TIMELINE_CONVERSATION_ALLOWLIST
);

export function isConversationVisibleTool(toolName: string): boolean {
	return CONVERSATION_VISIBLE_TOOLS.has(toolName);
}

export function getToolLogType(toolName: string): ToolTimelineLogType {
	if (toolName === "aiDecision") {
		return TOOL_TIMELINE_LOG_TYPE.DECISION;
	}

	if (isConversationVisibleTool(toolName)) {
		return TOOL_TIMELINE_LOG_TYPE.CUSTOMER_FACING;
	}

	return TOOL_TIMELINE_LOG_TYPE.LOG;
}
