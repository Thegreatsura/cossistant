import * as React from "react";
import { useRenderElement } from "../utils/use-render-element";

export type ConversationButtonAssignedAgent = {
	name?: string | null;
	image?: string | null;
	[key: string]: unknown;
};

export type ConversationButtonStateBase = {
	title?: React.ReactNode;
	lastMessageText?: React.ReactNode;
	assignedAgent?: ConversationButtonAssignedAgent;
	isTyping: boolean;
	status?: React.ReactNode;
};

export type ConversationButtonState<
	Extra extends Record<string, unknown> = Record<string, never>,
> = ConversationButtonStateBase & Extra;

export type ConversationButtonRenderProps<
	Extra extends Record<string, unknown> = Record<string, never>,
> = {
	state: ConversationButtonState<Extra>;
};

export type ConversationButtonChildren<
	Extra extends Record<string, unknown> = Record<string, never>,
> =
	| React.ReactNode
	| ((props: ConversationButtonRenderProps<Extra>) => React.ReactNode);

export type ConversationButtonProps<
	Extra extends Record<string, unknown> = Record<string, never>,
> = Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"children" | "className"
> & {
	title?: React.ReactNode;
	lastMessage?: React.ReactNode;
	status?: React.ReactNode;
	assignedAgent?: ConversationButtonAssignedAgent;
	isTyping?: boolean;
	className?: string | ((state: ConversationButtonState<Extra>) => string);
	render?: (
		props: React.HTMLProps<HTMLButtonElement>,
		state: ConversationButtonState<Extra>
	) => React.ReactElement;
	asChild?: boolean;
	state?: Partial<ConversationButtonState<Extra>>;
	children?: ConversationButtonChildren<Extra>;
};

function ConversationButtonInner<
	Extra extends Record<string, unknown> = Record<string, never>,
>(
	{
		title,
		lastMessage,
		status,
		assignedAgent,
		isTyping = false,
		className,
		render,
		asChild = false,
		state: providedState,
		type,
		children,
		...props
	}: ConversationButtonProps<Extra>,
	ref: React.Ref<HTMLButtonElement>
): React.ReactElement | null {
	const baseState: ConversationButtonStateBase = {
		title,
		lastMessageText: lastMessage,
		assignedAgent,
		isTyping,
		status,
	};

	const mergedState = {
		...baseState,
		...(providedState as Partial<ConversationButtonState<Extra>> | undefined),
	} as ConversationButtonState<Extra>;

	const renderProps: ConversationButtonRenderProps<Extra> = {
		state: mergedState,
	};

	const content =
		typeof children === "function" ? children(renderProps) : (children ?? null);

	return useRenderElement(
		"button",
		{
			className,
			render,
			asChild,
		},
		{
			ref,
			state: mergedState,
			props: {
				...props,
				type: type ?? "button",
				children: content,
			},
		}
	);
}

const ConversationButtonBase = React.forwardRef(ConversationButtonInner) as <
	Extra extends Record<string, unknown> = Record<string, never>,
>(
	props: ConversationButtonProps<Extra> & React.RefAttributes<HTMLButtonElement>
) => React.ReactElement | null;

ConversationButtonBase.displayName = "ConversationButton";

export { ConversationButtonBase as ConversationButton };
