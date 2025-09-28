import type { Message as MessageType } from "@cossistant/types";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import { useRenderElement } from "../utils/use-render-element";

/**
 * Metadata describing the origin of a message and pre-parsed content that can
 * be consumed by render-prop children.
 */
export type MessageRenderProps = {
	isVisitor: boolean;
	isAI: boolean;
	isHuman: boolean;
	timestamp: Date;
	bodyMd: string;
	senderType: "visitor" | "ai" | "human";
};

export type MessageProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	children?: React.ReactNode | ((props: MessageRenderProps) => React.ReactNode);
	asChild?: boolean;
	className?: string;
	message: MessageType;
};

/**
 * Minimal message wrapper that adds accessibility attributes and resolves the
 * sender type into convenient render props for custom bubble layouts.
 */
export const Message = (() => {
	const Component = React.forwardRef<HTMLDivElement, MessageProps>(
		({ children, className, asChild = false, message, ...props }, ref) => {
			// Determine sender type from message properties
			const isVisitor = message.visitorId !== null;
			const isAI = message.aiAgentId !== null;
			const isHuman = message.userId !== null && !isVisitor;

			const senderType = isVisitor ? "visitor" : isAI ? "ai" : "human";

			const renderProps: MessageRenderProps = {
				isVisitor,
				isAI,
				isHuman,
				timestamp: new Date(message.createdAt),
				bodyMd: message.bodyMd,
				senderType,
			};

			const messageContent =
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
						role: "article",
						"aria-label": `Message from ${
							isVisitor ? "visitor" : isAI ? "AI assistant" : "human agent"
						}`,
						...props,
						children: messageContent,
					},
				}
			);
		}
	);

	Component.displayName = "Message";
	return Component;
})();

const MemoizedMarkdownBlock = React.memo(
	({ content }: { content: string }) => {
		return (
			<ReactMarkdown
				components={{
					// Customize paragraph rendering to prevent excessive spacing
					p: ({ children }) => <span className="inline">{children}</span>,
					// Ensure proper line break handling
					br: () => <br />,
					// Handle code blocks properly
					code: ({ children, ...props }) => {
						// Check if it's inline code by looking at the parent element
						const isInline = !(
							"className" in props &&
							typeof props.className === "string" &&
							props.className.includes("language-")
						);
						return isInline ? (
							<code className="rounded bg-co-background-300 px-1 py-0.5 text-xs">
								{children}
							</code>
						) : (
							<pre className="overflow-x-auto rounded bg-co-background-300 p-2">
								<code className="text-xs">{children}</code>
							</pre>
						);
					},
					// Handle strong/bold text
					strong: ({ children }) => (
						<strong className="font-semibold">{children}</strong>
					),
					// Handle links
					a: ({ href, children }) => (
						<a
							className="underline hover:opacity-80"
							href={href}
							rel="noopener noreferrer"
							target="_blank"
						>
							{children}
						</a>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		);
	},
	(prevProps, nextProps) => {
		if (prevProps.content !== nextProps.content) {
			return false;
		}
		return true;
	}
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export type MessageContentProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	children?: React.ReactNode | ((content: string) => React.ReactNode);
	asChild?: boolean;
	className?: string;
	bodyMd?: string;
	renderMarkdown?: boolean;
};

/**
 * Renders the body of a message, optionally piping Markdown content through a
 * memoised renderer or handing the raw text to a render prop for custom
 * formatting.
 */
export const MessageContent = (() => {
	const Component = React.forwardRef<HTMLDivElement, MessageContentProps>(
		(
			{
				children,
				className,
				asChild = false,
				bodyMd = "",
				renderMarkdown = true,
				...props
			},
			ref
		) => {
			const messageContent = React.useMemo(() => {
				if (typeof children === "function") {
					return children(bodyMd);
				}
				if (children) {
					return children;
				}
				if (renderMarkdown && bodyMd) {
					return <MemoizedMarkdownBlock content={bodyMd} />;
				}
				return bodyMd;
			}, [children, bodyMd, renderMarkdown]);

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
						children: messageContent,
						style: {
							...props.style,
						},
					},
				}
			);
		}
	);

	Component.displayName = "MessageContent";
	return Component;
})();

export type MessageTimestampProps = Omit<
	React.HTMLAttributes<HTMLSpanElement>,
	"children"
> & {
	children?: React.ReactNode | ((timestamp: Date) => React.ReactNode);
	asChild?: boolean;
	className?: string;
	timestamp: Date;
	format?: (date: Date) => string;
};

/**
 * Timestamp helper that renders a formatted date or allows callers to supply a
 * render prop for custom time displays while preserving semantic markup.
 */
export const MessageTimestamp = (() => {
	const Component = React.forwardRef<HTMLSpanElement, MessageTimestampProps>(
		(
			{
				children,
				className,
				asChild = false,
				timestamp,
				format = (date) =>
					date.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					}),
				...props
			},
			ref
		) => {
			const content =
				typeof children === "function"
					? children(timestamp)
					: children || format(timestamp);

			return useRenderElement(
				"span",
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

	Component.displayName = "MessageTimestamp";
	return Component;
})();
