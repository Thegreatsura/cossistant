import type { Message as MessageType, SenderType } from "@cossistant/types";
import * as React from "react";
import { useRenderElement } from "../utils/use-render-element";

/**
 * Shape returned to render-prop children describing the grouped message state
 * and viewer specific flags.
 */
export type MessageGroupRenderProps = {
	// Sender information
	senderType: SenderType;
	senderId: string;

	// POV flags - who is viewing
	isSentByViewer: boolean; // True if the current viewer sent these messages
	isReceivedByViewer: boolean; // True if the current viewer received these messages

	// Sender type flags for convenience
	isVisitor: boolean;
	isAI: boolean;
	isTeamMember: boolean;

	// Message info
	messageCount: number;
	firstMessageId: string | undefined;
	lastMessageId: string | undefined;

	// Seen status
	hasBeenSeenByViewer?: boolean;
	seenByIds?: string[]; // IDs of users who have seen the last message in group
};

export type MessageGroupProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	children?:
		| React.ReactNode
		| ((props: MessageGroupRenderProps) => React.ReactNode);
	asChild?: boolean;
	className?: string;
	messages: MessageType[];

	// POV context - who is viewing these messages
	viewerId?: string; // ID of the current viewer
	viewerType?: SenderType; // Type of the current viewer

	// Seen data
	seenByIds?: string[]; // IDs of users who have seen these messages
	lastReadMessageIds?: Map<string, string>; // Map of userId -> lastMessageId they read
};

/**
 * Groups sequential messages from the same sender and exposes render helpers
 * that describe who sent the batch and whether the active viewer has seen it.
 * Consumers can either render their own layout via a render prop or rely on
 * slotted children.
 */
export const MessageGroup = (() => {
	type Props = MessageGroupProps;

	const Component = React.forwardRef<HTMLDivElement, Props>(
		(
			{
				children,
				className,
				asChild = false,
				messages = [],
				viewerId,
				seenByIds = [],
				lastReadMessageIds,
				...props
			},
			ref
		) => {
			// Determine sender type from first message in group
			const firstMessage = messages[0];
			// biome-ignore lint/style/useAtIndex: ok
			const lastMessage = messages[messages.length - 1];

			// Determine sender info
			let senderId = "";
			let senderType: SenderType;

			if (firstMessage?.visitorId) {
				senderId = firstMessage.visitorId;
				senderType = "visitor" as SenderType;
			} else if (firstMessage?.aiAgentId) {
				senderId = firstMessage.aiAgentId;
				senderType = "ai" as SenderType;
			} else if (firstMessage?.userId) {
				senderId = firstMessage.userId;
				senderType = "team_member" as SenderType;
			} else {
				// Fallback
				senderId = firstMessage?.id || "unknown";
				senderType = "team_member" as SenderType;
			}

			// Determine POV
			const isSentByViewer = viewerId ? senderId === viewerId : false;
			const isReceivedByViewer = viewerId ? senderId !== viewerId : true;

			// Convenience flags
			const isVisitor = senderType === "visitor";
			const isAI = senderType === "ai";
			const isTeamMember = senderType === "team_member";

			// Check if viewer has seen these messages
			const hasBeenSeenByViewer = viewerId
				? seenByIds.includes(viewerId)
				: undefined;

			const renderProps: MessageGroupRenderProps = {
				senderType,
				senderId,
				isSentByViewer,
				isReceivedByViewer,
				isVisitor,
				isAI,
				isTeamMember,
				messageCount: messages.length,
				firstMessageId: firstMessage?.id,
				lastMessageId: lastMessage?.id,
				hasBeenSeenByViewer,
				seenByIds,
			};

			const content =
				typeof children === "function" ? children(renderProps) : children;

			return useRenderElement(
				"div",
				{
					className,
					asChild,
				},
				{
					ref,
					state: renderProps,
					props: {
						role: "group",
						"aria-label": `Message group from ${senderType}`,
						...props,
						children: content,
					},
				}
			);
		}
	);

	Component.displayName = "MessageGroup";
	return Component;
})();

export type MessageGroupAvatarProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	children?: React.ReactNode;
	asChild?: boolean;
	className?: string;
};

/**
 * Optional slot rendered next to a grouped batch to display an avatar, agent
 * badge or any other sender metadata supplied by the consumer UI.
 */
export const MessageGroupAvatar = (() => {
	type Props = MessageGroupAvatarProps;

	const Component = React.forwardRef<HTMLDivElement, Props>(
		({ children, className, asChild = false, ...props }, ref) => {
			return useRenderElement(
				"div",
				{
					className,
					asChild,
				},
				{
					ref,
					props: {
						...props,
						children,
					},
				}
			);
		}
	);

	Component.displayName = "MessageGroupAvatar";
	return Component;
})();

export type MessageGroupHeaderProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	children?:
		| React.ReactNode
		| ((props: {
				name?: string;
				senderId?: string;
				senderType?: SenderType;
		  }) => React.ReactNode);
	asChild?: boolean;
	className?: string;
	name?: string;
	senderId?: string;
	senderType?: SenderType;
};

/**
 * Decorative or semantic wrapper rendered above a message batch. Useful for
 * injecting agent names, timestamps or custom status labels tied to the sender
 * metadata supplied by `MessageGroup`.
 */
export const MessageGroupHeader = (() => {
	type Props = MessageGroupHeaderProps;

	const Component = React.forwardRef<HTMLDivElement, Props>(
		(
			{
				children,
				className,
				asChild = false,
				name,
				senderId,
				senderType,
				...props
			},
			ref
		) => {
			const content =
				typeof children === "function"
					? children({ name, senderId, senderType })
					: children;

			return useRenderElement(
				"div",
				{
					className,
					asChild,
				},
				{
					ref,
					props: {
						...props,
						children: content,
					},
				}
			);
		}
	);

	Component.displayName = "MessageGroupHeader";
	return Component;
})();

export type MessageGroupContentProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	children?: React.ReactNode;
	asChild?: boolean;
	className?: string;
};

/**
 * Container for the actual message bubbles within a batch. Consumers can
 * override the structure while inheriting layout props passed down from the
 * parent group.
 */
export const MessageGroupContent = (() => {
	type Props = MessageGroupContentProps;

	const Component = React.forwardRef<HTMLDivElement, Props>(
		({ children, className, asChild = false, ...props }, ref) => {
			return useRenderElement(
				"div",
				{
					className,
					asChild,
				},
				{
					ref,
					props: {
						...props,
						children,
					},
				}
			);
		}
	);

	Component.displayName = "MessageGroupContent";
	return Component;
})();

export type MessageGroupSeenIndicatorProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	children?:
		| React.ReactNode
		| ((props: {
				seenByIds: string[];
				hasBeenSeen: boolean;
		  }) => React.ReactNode);
	asChild?: boolean;
	className?: string;
	seenByIds?: string[];
};

/**
 * Utility slot for showing who has viewed the most recent message in the
 * group. Works with simple text children or a render prop for advanced
 * displays.
 */
export const MessageGroupSeenIndicator = (() => {
	type Props = MessageGroupSeenIndicatorProps;

	const Component = React.forwardRef<HTMLDivElement, Props>(
		(
			{ children, className, asChild = false, seenByIds = [], ...props },
			ref
		) => {
			const hasBeenSeen = seenByIds.length > 0;
			const content =
				typeof children === "function"
					? children({ seenByIds, hasBeenSeen })
					: children;

			return useRenderElement(
				"div",
				{
					className,
					asChild,
				},
				{
					ref,
					props: {
						...props,
						children: content,
					},
				}
			);
		}
	);

	Component.displayName = "MessageGroupSeenIndicator";
	return Component;
})();

export type MessageGroupReadIndicatorProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	children?:
		| React.ReactNode
		| ((props: {
				readers: Array<{ userId: string; isLastRead: boolean }>;
				lastReaderIds: string[];
		  }) => React.ReactNode);
	asChild?: boolean;
	className?: string;
	messageId: string;
	lastReadMessageIds?: Map<string, string>;
};

/**
 * Renders read receipts for the tail message in a group. It surfaces the list
 * of readers and callers can decide whether to render avatars, tooltips or a
 * basic label.
 */
export const MessageGroupReadIndicator = (() => {
	type Props = MessageGroupReadIndicatorProps;

	const Component = React.forwardRef<HTMLDivElement, Props>(
		(
			{
				children,
				className,
				asChild = false,
				messageId,
				lastReadMessageIds,
				...props
			},
			ref
		) => {
			// Find all users who stopped reading at this message
			const lastReaderIds: string[] = [];
			const readers: Array<{ userId: string; isLastRead: boolean }> = [];

			if (lastReadMessageIds) {
				lastReadMessageIds.forEach((lastMessageId, userId) => {
					if (lastMessageId === messageId) {
						lastReaderIds.push(userId);
						readers.push({ userId, isLastRead: true });
					}
				});
			}

			const content =
				typeof children === "function"
					? children({ readers, lastReaderIds })
					: children;

			return useRenderElement(
				"div",
				{
					className,
					asChild,
				},
				{
					ref,
					props: {
						...props,
						children: content,
					},
				}
			);
		}
	);

	Component.displayName = "MessageGroupReadIndicator";
	return Component;
})();
