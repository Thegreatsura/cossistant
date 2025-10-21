import type { RouterOutputs } from "@api/trpc/types";
import { TimelineItemGroupReadIndicator } from "@cossistant/next/primitives";
import type { AvailableAIAgent } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { motion } from "motion/react";
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

        return (
                <TimelineItemGroupReadIndicator
                        className="mt-1"
                        itemId={messageId}
                        lastReadItemIds={lastReadMessageIds}
                >
                        {({ lastReaderIds }) => {
                                const containerClassName = cn(
                                        "my-6 flex min-h-[1.5rem] items-center gap-1",
                                        isSentByViewer ? "justify-end" : "justify-start"
                                );

                                if (lastReaderIds.length === 0) {
                                        return <div aria-hidden className={containerClassName} />;
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
                                        return <div aria-hidden className={containerClassName} />;
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
                                                        visitor?.id === id ||
                                                        messages.some((item) => item.visitorId === id);

                                                if (_isVisitor) {
                                                        return {
                                                                id,
                                                                name: visitorName,
                                                                image: visitor?.contact?.image ?? undefined,
                                                                type: "visitor" as const,
                                                        };
                                                }

                                                return null;
                                        })
                                        .filter(Boolean);

                                if (readerInfo.length === 0) {
                                        return <div aria-hidden className={containerClassName} />;
                                }

                                return (
                                        <div className={containerClassName}>
                                                <div className="-space-x-2 flex">
                                                        {readerInfo.slice(0, 3).map(
                                                                (reader) =>
                                                                        reader && (
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
                                                                                        ) : reader.type === "visitor" ? (
                                                                                                <Avatar
                                                                                                        className="size-6 rounded border border-background"
                                                                                                        fallbackName={visitorName}
                                                                                                        url={reader.image}
                                                                                                        withBoringAvatar
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
                </TimelineItemGroupReadIndicator>
        );
}
