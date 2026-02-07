import { generateIdempotentULID, generateULID } from "@api/utils/db/ids";
import {
	createTimelineItem,
	updateTimelineItem,
} from "@api/utils/timeline-item";
import {
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import type { ToolExecutionOptions, ToolSet } from "ai";
import type { ToolContext } from "./types";

const MAX_SANITIZE_DEPTH = 4;
const MAX_OBJECT_KEYS = 30;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 500;
const MAX_SERIALIZED_LENGTH = 6000;

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}\d/g;
const BEARER_PATTERN = /bearer\s+[A-Za-z0-9._-]+/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactString(value: string): string {
	return value
		.replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
		.replace(PHONE_PATTERN, "[REDACTED_PHONE]")
		.replace(BEARER_PATTERN, "[REDACTED_BEARER_TOKEN]")
		.replace(JWT_PATTERN, "[REDACTED_JWT]");
}

function truncateString(value: string, maxLength: number): string {
	if (value.length <= maxLength) {
		return value;
	}

	return `${value.slice(0, maxLength)}... [truncated ${value.length - maxLength} chars]`;
}

function isSensitiveKey(key: string): boolean {
	const normalizedKey = key.toLowerCase();
	const sensitiveKeywords = [
		"token",
		"secret",
		"password",
		"pass",
		"apikey",
		"api_key",
		"authorization",
		"auth",
		"cookie",
		"session",
		"email",
		"phone",
	];

	return sensitiveKeywords.some((keyword) => normalizedKey.includes(keyword));
}

function sanitizeToolDebugValueInternal(
	value: unknown,
	depth: number,
	seen: WeakSet<object>
): unknown {
	if (
		value === null ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}

	if (typeof value === "string") {
		return truncateString(redactString(value), MAX_STRING_LENGTH);
	}

	if (typeof value === "undefined") {
		return "[Undefined]";
	}

	if (typeof value === "bigint") {
		return value.toString();
	}

	if (typeof value === "function") {
		return "[Function]";
	}

	if (depth >= MAX_SANITIZE_DEPTH) {
		return "[MaxDepthExceeded]";
	}

	if (Array.isArray(value)) {
		const sanitizedItems = value
			.slice(0, MAX_ARRAY_ITEMS)
			.map((item) => sanitizeToolDebugValueInternal(item, depth + 1, seen));

		if (value.length > MAX_ARRAY_ITEMS) {
			sanitizedItems.push(`[${value.length - MAX_ARRAY_ITEMS} more items]`);
		}

		return sanitizedItems;
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (typeof value === "object") {
		if (seen.has(value)) {
			return "[Circular]";
		}

		seen.add(value);

		const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
		const sanitized: Record<string, unknown> = {};

		for (const [key, nestedValue] of entries) {
			if (isSensitiveKey(key)) {
				sanitized[key] = "[REDACTED]";
				continue;
			}

			sanitized[key] = sanitizeToolDebugValueInternal(
				nestedValue,
				depth + 1,
				seen
			);
		}

		if (Object.keys(value).length > MAX_OBJECT_KEYS) {
			sanitized.__truncatedKeys = Object.keys(value).length - MAX_OBJECT_KEYS;
		}

		return sanitized;
	}

	return String(value);
}

function limitSerializedSize(value: unknown): unknown {
	try {
		const serialized = JSON.stringify(value);
		if (!serialized || serialized.length <= MAX_SERIALIZED_LENGTH) {
			return value;
		}

		return {
			truncated: true,
			size: serialized.length,
			preview: `${serialized.slice(0, MAX_SERIALIZED_LENGTH)}...`,
		};
	} catch {
		return "[UnserializableValue]";
	}
}

export function sanitizeToolDebugValue(value: unknown): unknown {
	return limitSerializedSize(
		sanitizeToolDebugValueInternal(value, 0, new WeakSet<object>())
	);
}

function sanitizeToolInput(input: unknown): Record<string, unknown> {
	if (isRecord(input)) {
		return sanitizeToolDebugValue(input) as Record<string, unknown>;
	}

	return {
		value: sanitizeToolDebugValue(input),
	};
}

function summarizeSearchKnowledgeBaseOutput(output: unknown): unknown {
	if (!isRecord(output)) {
		return output;
	}

	const data = isRecord(output.data) ? output.data : null;
	const articles = Array.isArray(data?.articles) ? data.articles : [];

	const summarizedArticles = articles.slice(0, 5).map((article, index) => {
		if (!isRecord(article)) {
			return { index };
		}

		const content = typeof article.content === "string" ? article.content : "";

		return {
			index,
			title:
				typeof article.title === "string" ? redactString(article.title) : null,
			sourceUrl:
				typeof article.sourceUrl === "string"
					? redactString(article.sourceUrl)
					: null,
			sourceType:
				typeof article.sourceType === "string" ? article.sourceType : null,
			similarity:
				typeof article.similarity === "number" ? article.similarity : null,
			snippet: content ? truncateString(redactString(content), 220) : "",
		};
	});

	return {
		success: output.success === true,
		error:
			typeof output.error === "string"
				? truncateString(redactString(output.error), MAX_STRING_LENGTH)
				: null,
		data: {
			query:
				typeof data?.query === "string"
					? truncateString(redactString(data.query), MAX_STRING_LENGTH)
					: null,
			totalFound:
				typeof data?.totalFound === "number"
					? data.totalFound
					: articles.length,
			lowConfidence: data?.lowConfidence === true,
			guidance:
				typeof data?.guidance === "string"
					? truncateString(redactString(data.guidance), MAX_STRING_LENGTH)
					: null,
			articlesCount: articles.length,
			articles: summarizedArticles,
		},
	};
}

function sanitizeToolOutput(toolName: string, output: unknown): unknown {
	if (toolName === "searchKnowledgeBase") {
		return sanitizeToolDebugValue(summarizeSearchKnowledgeBaseOutput(output));
	}

	return sanitizeToolDebugValue(output);
}

function toErrorText(error: unknown): string {
	if (typeof error === "string") {
		return truncateString(redactString(error), MAX_STRING_LENGTH);
	}

	if (error instanceof Error) {
		return truncateString(redactString(error.message), MAX_STRING_LENGTH);
	}

	return "Tool execution failed";
}

function getFailureTextFromResult(result: unknown): string | null {
	if (!isRecord(result)) {
		return null;
	}

	if ("success" in result && result.success === false) {
		if (typeof result.error === "string" && result.error.length > 0) {
			return toErrorText(result.error);
		}
		return "Tool returned success=false";
	}

	if (
		"success" in result &&
		result.success !== true &&
		typeof result.error === "string" &&
		result.error.length > 0
	) {
		return toErrorText(result.error);
	}

	return null;
}

function getWorkflowRunId(toolContext: ToolContext): string {
	return toolContext.workflowRunId ?? toolContext.triggerMessageId;
}

export function createToolTimelineItemId(params: {
	workflowRunId: string;
	toolCallId: string;
}): string {
	return generateIdempotentULID(
		`tool:${params.workflowRunId}:${params.toolCallId}`
	);
}

function buildToolPart(params: {
	toolName: string;
	toolCallId: string;
	state: "partial" | "result" | "error";
	input: Record<string, unknown>;
	output?: unknown;
	errorText?: string;
}): Record<string, unknown> {
	return {
		type: `tool-${params.toolName}`,
		toolCallId: params.toolCallId,
		toolName: params.toolName,
		input: params.input,
		state: params.state,
		...(params.output === undefined ? {} : { output: params.output }),
		...(params.errorText ? { errorText: params.errorText } : {}),
	};
}

function isUniqueViolationError(error: unknown): boolean {
	if (isRecord(error) && typeof error.code === "string") {
		return error.code === "23505";
	}

	if (isRecord(error) && "cause" in error) {
		const cause = error.cause;
		if (isRecord(cause) && typeof cause.code === "string") {
			return cause.code === "23505";
		}
	}

	return false;
}

async function safeCreatePartialToolTimelineItem(params: {
	toolContext: ToolContext;
	timelineItemId: string;
	toolName: string;
	toolCallId: string;
	sanitizedInput: Record<string, unknown>;
}): Promise<void> {
	const { toolContext, timelineItemId, toolName, toolCallId, sanitizedInput } =
		params;

	try {
		await createTimelineItem({
			db: toolContext.db,
			organizationId: toolContext.organizationId,
			websiteId: toolContext.websiteId,
			conversationId: toolContext.conversationId,
			conversationOwnerVisitorId: toolContext.visitorId,
			item: {
				id: timelineItemId,
				type: ConversationTimelineType.TOOL,
				text: `Tool call: ${toolName}`,
				parts: [
					buildToolPart({
						toolName,
						toolCallId,
						state: "partial",
						input: sanitizedInput,
					}),
				],
				aiAgentId: toolContext.aiAgentId,
				visitorId: toolContext.visitorId,
				visibility: TimelineItemVisibility.PRIVATE,
				tool: toolName,
			},
		});
	} catch (error) {
		if (isUniqueViolationError(error)) {
			await safeUpdateToolTimelineItem({
				toolContext,
				timelineItemId,
				toolName,
				toolCallId,
				state: "partial",
				sanitizedInput,
			});
			return;
		}

		console.warn(
			`[tool-call-logger] conv=${toolContext.conversationId} | Failed to create tool timeline item for ${toolName}:`,
			error
		);
	}
}

async function safeUpdateToolTimelineItem(params: {
	toolContext: ToolContext;
	timelineItemId: string;
	toolName: string;
	toolCallId: string;
	state: "partial" | "result" | "error";
	sanitizedInput: Record<string, unknown>;
	sanitizedOutput?: unknown;
	errorText?: string;
}): Promise<void> {
	const {
		toolContext,
		timelineItemId,
		toolName,
		toolCallId,
		state,
		sanitizedInput,
		sanitizedOutput,
		errorText,
	} = params;

	try {
		await updateTimelineItem({
			db: toolContext.db,
			organizationId: toolContext.organizationId,
			websiteId: toolContext.websiteId,
			conversationId: toolContext.conversationId,
			conversationOwnerVisitorId: toolContext.visitorId,
			itemId: timelineItemId,
			item: {
				text: `Tool call: ${toolName}`,
				parts: [
					buildToolPart({
						toolName,
						toolCallId,
						state,
						input: sanitizedInput,
						output: sanitizedOutput,
						errorText,
					}),
				],
				tool: toolName,
			},
		});
	} catch (error) {
		console.warn(
			`[tool-call-logger] conv=${toolContext.conversationId} | Failed to update tool timeline item ${timelineItemId}:`,
			error
		);
	}
}

export function wrapToolsWithTimelineLogging(
	tools: ToolSet,
	toolContext: ToolContext
): ToolSet {
	const wrappedTools: ToolSet = {};

	for (const [toolName, toolDefinition] of Object.entries(tools)) {
		if (!toolDefinition.execute) {
			wrappedTools[toolName] = toolDefinition;
			continue;
		}

		const originalExecute = toolDefinition.execute;

		wrappedTools[toolName] = {
			...toolDefinition,
			execute: async (input: unknown, options?: ToolExecutionOptions) => {
				const toolCallId =
					typeof options?.toolCallId === "string" &&
					options.toolCallId.length > 0
						? options.toolCallId
						: generateULID();

				const workflowRunId = getWorkflowRunId(toolContext);
				const timelineItemId = createToolTimelineItemId({
					workflowRunId,
					toolCallId,
				});
				const sanitizedInput = sanitizeToolInput(input);

				await safeCreatePartialToolTimelineItem({
					toolContext,
					timelineItemId,
					toolName,
					toolCallId,
					sanitizedInput,
				});

				try {
					const result = await originalExecute(
						input as never,
						options as never
					);
					const failureText = getFailureTextFromResult(result);

					if (failureText) {
						await safeUpdateToolTimelineItem({
							toolContext,
							timelineItemId,
							toolName,
							toolCallId,
							state: "error",
							sanitizedInput,
							sanitizedOutput: sanitizeToolOutput(toolName, result),
							errorText: failureText,
						});
					} else {
						await safeUpdateToolTimelineItem({
							toolContext,
							timelineItemId,
							toolName,
							toolCallId,
							state: "result",
							sanitizedInput,
							sanitizedOutput: sanitizeToolOutput(toolName, result),
						});
					}

					return result;
				} catch (error) {
					await safeUpdateToolTimelineItem({
						toolContext,
						timelineItemId,
						toolName,
						toolCallId,
						state: "error",
						sanitizedInput,
						errorText: toErrorText(error),
					});
					throw error;
				}
			},
		};
	}

	return wrappedTools;
}
