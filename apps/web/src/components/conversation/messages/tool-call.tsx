import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { cn } from "@/lib/utils";

type ToolTimelinePart = {
	type: string;
	toolCallId: string;
	toolName: string;
	input: Record<string, unknown>;
	state: "partial" | "result" | "error";
	output?: unknown;
	errorText?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToolTimelinePart(part: unknown): part is ToolTimelinePart {
	if (!isRecord(part)) {
		return false;
	}

	return (
		typeof part.type === "string" &&
		part.type.startsWith("tool-") &&
		typeof part.toolCallId === "string" &&
		typeof part.toolName === "string" &&
		isRecord(part.input) &&
		(part.state === "partial" ||
			part.state === "result" ||
			part.state === "error")
	);
}

function extractToolPart(item: TimelineItem): ToolTimelinePart | null {
	for (const part of item.parts) {
		if (isToolTimelinePart(part)) {
			return part;
		}
	}

	return null;
}

function getFallbackSummary(
	toolName: string,
	state: ToolTimelinePart["state"]
): string {
	if (state === "partial") {
		return `Running ${toolName}`;
	}

	if (state === "result") {
		return `Completed ${toolName}`;
	}

	return `Failed ${toolName}`;
}

function safeJson(value: unknown): string {
	try {
		const serialized = JSON.stringify(value, null, 2);
		if (!serialized) {
			return "{}";
		}
		if (serialized.length <= 4000) {
			return serialized;
		}
		return `${serialized.slice(0, 4000)}\n... [truncated]`;
	} catch {
		return "[unserializable value]";
	}
}

const stateConfig: Record<
	ToolTimelinePart["state"],
	{ label: string; className: string }
> = {
	partial: {
		label: "Running",
		className:
			"border-amber-300/70 bg-amber-100/70 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/30 dark:text-amber-100",
	},
	result: {
		label: "Success",
		className:
			"border-emerald-300/70 bg-emerald-100/70 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/30 dark:text-emerald-100",
	},
	error: {
		label: "Error",
		className:
			"border-red-300/70 bg-red-100/70 text-red-900 dark:border-red-700/70 dark:bg-red-900/30 dark:text-red-100",
	},
};

function DebugBlock({ label, value }: { label: string; value: unknown }) {
	return (
		<div className="space-y-1">
			<div className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
				{label}
			</div>
			<pre className="max-h-56 overflow-auto rounded-md border border-border/50 bg-background/70 p-2 text-[11px] leading-relaxed">
				{safeJson(value)}
			</pre>
		</div>
	);
}

export function ToolCall({ item }: { item: TimelineItem }) {
	const toolPart = extractToolPart(item);
	if (!toolPart) {
		return null;
	}

	const config = stateConfig[toolPart.state];
	const summaryText =
		typeof item.text === "string" && item.text.trim().length > 0
			? item.text
			: getFallbackSummary(toolPart.toolName, toolPart.state);

	return (
		<div className="rounded-lg border border-border/60 bg-muted/30 p-3">
			<div className="flex items-center gap-2 text-xs">
				<span className="font-semibold text-foreground">{summaryText}</span>
				<span
					className={cn(
						"inline-flex items-center rounded-md border px-1.5 py-0.5 font-medium",
						config.className
					)}
				>
					{config.label}
				</span>
				<time className="text-muted-foreground">
					{new Date(item.createdAt).toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</time>
			</div>
			<div className="mt-1 text-[11px] text-muted-foreground">
				Tool: <span className="font-mono">{toolPart.toolName}</span>
			</div>

			<details className="group mt-2">
				<summary className="cursor-pointer text-[11px] text-muted-foreground transition-colors hover:text-foreground">
					Debug details
				</summary>
				<div className="mt-2 space-y-2">
					<div className="text-[11px] text-muted-foreground">
						Call ID: <span className="font-mono">{toolPart.toolCallId}</span>
					</div>
					<DebugBlock label="Input" value={toolPart.input} />
					{toolPart.state === "result" && toolPart.output !== undefined ? (
						<DebugBlock label="Output" value={toolPart.output} />
					) : null}
					{toolPart.state === "error" && toolPart.errorText ? (
						<DebugBlock label="Error" value={toolPart.errorText} />
					) : null}
				</div>
			</details>
		</div>
	);
}
