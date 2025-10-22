import type { RouterOutputs } from "@api/trpc/types";
import { TimelineItemGroupReadIndicator } from "@cossistant/next/primitives";
import type { AvailableAIAgent } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { motion } from "motion/react";
import { useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import type { ConversationHeader } from "@/contexts/inboxes";
import { cn } from "@/lib/utils";
import { getVisitorNameWithFallback } from "@/lib/visitors";

type ReadIndicatorProps = {
	lastReadMessageIds: Map<string, string> | undefined;
	messageId: string;
	currentUserId: string | undefined;
	firstMessage: TimelineItem | undefined;
	teamMembers: RouterOutputs["user"]["getWebsiteMembers"];
	availableAIAgents: AvailableAIAgent[];
	visitor: ConversationHeader["visitor"];
	messages: TimelineItem[];
	isSentByViewer: boolean;
};

type ReaderInfo =
	| {
			id: string;
			type: "human";
			name: string | null;
			image: string | null;
			email: string | null;
	  }
	| {
			id: string;
			type: "ai";
			name: string | null;
	  }
	| {
			id: string;
			type: "visitor";
			name: string;
			image: string | undefined;
	  };

const isReaderInfo = (value: ReaderInfo | null): value is ReaderInfo =>
	value !== null;

export function ReadIndicator({
	lastReadMessageIds,
	messageId,
	currentUserId,
	firstMessage,
	teamMembers,
	availableAIAgents,
	visitor,
	messages,
	isSentByViewer,
}: ReadIndicatorProps) {
	const visitorName = getVisitorNameWithFallback(visitor);
	const visitorParticipantIds = useMemo(() => {
		const ids = new Set<string>();

		if (visitor?.id) {
			ids.add(visitor.id);
		}

		for (const item of messages) {
			if (item.visitorId) {
				ids.add(item.visitorId);
			}
		}

		return ids;
	}, [messages, visitor?.id]);

	return (
		<TimelineItemGroupReadIndicator
			className="mt-1"
			itemId={messageId}
			lastReadItemIds={lastReadMessageIds}
		>
			{({ lastReaderIds }) => {
				const containerClassName = cn(
					"my-0 flex min-h-[1.5rem] items-center gap-1",
					isSentByViewer ? "justify-end" : "justify-start"
				);

				if (lastReaderIds.length === 0) {
					return null;
				}

				// Filter out the current user and the sender
				const otherReaders = lastReaderIds.filter(
					(id) =>
						id !== currentUserId &&
						id !== firstMessage?.userId &&
						id !== firstMessage?.visitorId &&
						id !== firstMessage?.aiAgentId
				);
				const uniqueReaderIds = Array.from(new Set(otherReaders));

				if (uniqueReaderIds.length === 0) {
					return null;
				}

				// Get names/avatars of people who stopped reading here
				const readerInfo = uniqueReaderIds
					.map((id): ReaderInfo | null => {
						const human = teamMembers.find((a) => a.id === id);
						if (human) {
							return {
								id,
								name: human.name ?? null,
								image: human.image,
								email: human.email,
								type: "human",
							};
						}

						const ai = availableAIAgents.find((a) => a.id === id);
						if (ai) {
							return { id, name: ai.name, type: "ai" };
						}

						if (visitorParticipantIds.has(id)) {
							return {
								id,
								name: visitorName,
								image: visitor?.contact?.image ?? undefined,
								type: "visitor",
							};
						}

						return null;
					})
					.filter(isReaderInfo);

				if (readerInfo.length === 0) {
					return <div aria-hidden className={containerClassName} />;
				}

				return (
					<div className={containerClassName}>
						<div className="-space-x-2 flex">
							{readerInfo.slice(0, 3).map((reader) => (
								<motion.div
									className="relative"
									key={reader.id}
									layoutId={`read-indicator-${reader.id}`}
									transition={{
										type: "tween",
										duration: 0.12,
										ease: "easeOut",
									}}
								>
									{reader.type === "human" ? (
										<Avatar
											className="size-6 rounded border border-background"
											fallbackName={
												reader.name ||
												reader.email?.split("@")[0] ||
												"Unknown member"
											}
											url={reader.image}
										/>
									) : reader.type === "ai" ? (
										<div className="flex size-6 items-center justify-center rounded border border-background bg-primary/10">
											<Logo className="h-2.5 w-2.5 text-primary" />
										</div>
									) : (
										<Avatar
											className="size-6 rounded border border-background"
											fallbackName={visitorName}
											url={reader.image}
											withBoringAvatar
										/>
									)}
								</motion.div>
							))}
						</div>
						{readerInfo.length > 3 && (
							<span className="text-[10px] text-muted-foreground">
								+{readerInfo.length - 3}
							</span>
						)}
					</div>
				);
			}}
		</TimelineItemGroupReadIndicator>
	);
}
