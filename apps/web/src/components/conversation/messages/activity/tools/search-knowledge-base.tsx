import { ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ActivityWrapper } from "../activity-wrapper";
import type { ToolActivityProps } from "../types";

type ArticleSummary = {
	title?: string | null;
	sourceUrl?: string | null;
	sourceType?: string | null;
	similarity?: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractArticles(output: unknown): ArticleSummary[] {
	if (!isRecord(output)) {
		return [];
	}

	const data = isRecord(output.data) ? output.data : null;
	const articles = Array.isArray(data?.articles) ? data.articles : [];

	return articles
		.filter((a): a is Record<string, unknown> => isRecord(a))
		.map((a) => ({
			title: typeof a.title === "string" ? a.title : null,
			sourceUrl: typeof a.sourceUrl === "string" ? a.sourceUrl : null,
			sourceType: typeof a.sourceType === "string" ? a.sourceType : null,
			similarity: typeof a.similarity === "number" ? a.similarity : null,
		}));
}

function extractSourceCount(output: unknown): number | null {
	if (!isRecord(output)) {
		return null;
	}

	const data = isRecord(output.data) ? output.data : null;
	if (typeof data?.totalFound === "number") {
		return data.totalFound;
	}

	const articles = Array.isArray(data?.articles) ? data.articles : null;
	return articles ? articles.length : null;
}

function SourceList({ articles }: { articles: ArticleSummary[] }) {
	const [open, setOpen] = useState(false);

	if (articles.length === 0) {
		return null;
	}

	return (
		<Collapsible onOpenChange={setOpen} open={open}>
			<CollapsibleTrigger className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground">
				<ChevronRight
					className={`size-3 transition-transform ${open ? "rotate-90" : ""}`}
				/>
				View sources
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="mt-1.5 space-y-1">
					{articles.map((article, i) => (
						<div
							className="flex items-baseline gap-2 text-[10px] text-muted-foreground"
							key={article.sourceUrl ?? i}
						>
							{article.sourceType ? (
								<span className="shrink-0 uppercase tracking-wide">
									{article.sourceType}
								</span>
							) : null}
							{article.sourceUrl ? (
								<a
									className="truncate text-foreground/80 underline decoration-muted-foreground/30 hover:text-foreground"
									href={article.sourceUrl}
									rel="noopener noreferrer"
									target="_blank"
								>
									{article.title ?? article.sourceUrl}
									<ExternalLink className="ml-0.5 inline size-2.5" />
								</a>
							) : (
								<span className="truncate text-foreground/80">
									{article.title ?? "Untitled"}
								</span>
							)}
							{typeof article.similarity === "number" ? (
								<span className="ml-auto shrink-0">
									{Math.round(article.similarity * 100)}%
								</span>
							) : null}
						</div>
					))}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

export function SearchKnowledgeBaseActivity({
	toolCall,
	timestamp,
}: ToolActivityProps) {
	const { state, output, summaryText } = toolCall;

	if (state === "partial") {
		return (
			<ActivityWrapper
				state="partial"
				text="Searching knowledge base..."
				timestamp={timestamp}
			/>
		);
	}

	if (state === "error") {
		return (
			<ActivityWrapper
				state="error"
				text="Knowledge base lookup failed"
				timestamp={timestamp}
			/>
		);
	}

	const count = extractSourceCount(output);
	const articles = extractArticles(output);
	const resultText =
		typeof count === "number"
			? `Found ${count} source${count === 1 ? "" : "s"}`
			: summaryText;

	return (
		<ActivityWrapper state="result" text={resultText} timestamp={timestamp}>
			<SourceList articles={articles} />
		</ActivityWrapper>
	);
}
