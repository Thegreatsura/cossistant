import type { RouterOutputs } from "@api/trpc/types";
import { MessageGroupReadIndicator } from "@cossistant/next/primitives";
import type {
	AvailableAIAgent,
	ConversationHeader,
	Message,
	MessageType,
} from "@cossistant/types";
import { motion } from "motion/react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { getVisitorNameWithFallback } from "@/lib/visitors";

type Props = {
	lastReadMessageIds: Map<string, string> | undefined;
	messageId: string;
	currentUserId: string | undefined;
	firstMessage: Message | undefined;
	teamMembers: RouterOutputs["user"]["getWebsiteMembers"];
	availableAIAgents: AvailableAIAgent[];
	visitor: ConversationHeader["visitor"];
	messages: Message[];
	isSentByViewer: boolean;
};

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
}: Props) {
	const visitorName = getVisitorNameWithFallback(visitor);

	return (
		<MessageGroupReadIndicator
			className="mt-1"
			lastReadMessageIds={lastReadMessageIds}
			messageId={messageId}
		>
			{({ lastReaderIds }) => {
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

				if (otherReaders.length === 0) {
					return null;
				}

				// Get names/avatars of people who stopped reading here
				const readerInfo = otherReaders
					.map((id) => {
						const human = teamMembers.find((a) => a.id === id);
						if (human) {
							return {
								id,
								name: human.name,
								image: human.image,
								email: human.email,
								type: "human" as const,
							};
						}

						const ai = availableAIAgents.find((a) => a.id === id);
						if (ai) {
							return { id, name: ai.name, type: "ai" as const };
						}

						const _isVisitor =
							visitor?.id === id || messages.some((m) => m.visitorId === id);

						if (_isVisitor) {
							return {
								id,
								name: visitorName,
								image: visitor?.avatar ?? undefined,
								type: "visitor" as const,
							};
						}

						return null;
					})
					.filter(Boolean);

				if (readerInfo.length === 0) {
					return null;
				}

				return (
					<div
						className={cn(
							"mt-6 flex items-center gap-1",
							isSentByViewer ? "justify-end" : "justify-start"
						)}
					>
						<div className="-space-x-2 flex">
							{readerInfo.slice(0, 3).map(
								(reader) =>
									reader && (
										<motion.div
											className="relative"
											key={reader.id}
											layoutId={`read-indicator-${reader.id}`}
										>
											{reader.type === "human" ? (
												<Avatar
													className="size-5 rounded border border-background"
													fallbackName={
														reader.name ||
														reader.email?.split("@")[0] ||
														"Unknown member"
													}
													url={reader.image}
												/>
											) : reader.type === "ai" ? (
												<div className="flex size-5 items-center justify-center rounded border border-background bg-primary/10">
													<Logo className="h-2.5 w-2.5 text-primary" />
												</div>
											) : reader.type === "visitor" ? (
												<Avatar
													className="size-5 rounded border border-background"
													fallbackName={visitorName}
													url={reader.image}
												/>
											) : null}
										</motion.div>
									)
							)}
						</div>
						{readerInfo.length > 3 && (
							<span className="text-[10px] text-muted-foreground">
								+{readerInfo.length - 3}
							</span>
						)}
					</div>
				);
			}}
		</MessageGroupReadIndicator>
	);
}
