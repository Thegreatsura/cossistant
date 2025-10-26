import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { useRenderElement } from "../utils/use-render-element";

export type ConversationButtonStatusTone = "success" | "neutral" | "warning";

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
        statusTone: ConversationButtonStatusTone;
};

export type ConversationButtonState<
        Extra extends Record<string, unknown> = Record<string, never>,
> = ConversationButtonStateBase & Extra;

export type ConversationButtonProps<
        Extra extends Record<string, unknown> = Record<string, never>,
> = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
        title?: React.ReactNode;
        lastMessage?: React.ReactNode;
        status?: React.ReactNode;
        statusTone?: ConversationButtonStatusTone;
        assignedAgent?: ConversationButtonAssignedAgent;
        isTyping?: boolean;
        typingIndicator?: React.ReactNode;
        trailingIcon?: React.ReactNode;
        statusBadge?: React.ReactNode;
        statusClassName?: string | ((tone: ConversationButtonStatusTone) => string);
        avatar?: React.ReactNode;
        className?: string | ((state: ConversationButtonState<Extra>) => string);
        render?: (
                props: React.HTMLProps<HTMLButtonElement>,
                state: ConversationButtonState<Extra>,
        ) => React.ReactElement;
        asChild?: boolean;
        state?: Partial<ConversationButtonState<Extra>>;
};

const STATUS_TONE_CLASS_MAP: Record<ConversationButtonStatusTone, string> = {
        success: "bg-co-success/20 text-co-success-foreground",
        neutral: "bg-co-neutral/20 text-co-neutral-foreground",
        warning: "bg-co-warning/20 text-co-warning-foreground",
};

const BASE_BUTTON_CLASSNAME = [
        "group/btn inline-flex shrink-0 items-center justify-start gap-3 whitespace-nowrap rounded-md border font-medium text-sm outline-none transition-all hover:cursor-pointer focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "border-co-border/50 bg-co-background-50 hover:bg-co-background-100 hover:text-co-foreground dark:bg-co-background-300 dark:hover:bg-co-background-400",
        "h-14 px-6 has-[>svg]:px-4",
        "relative border-0 border-b border-co-border/50 text-left transition-colors first-of-type:rounded-t last-of-type:rounded-b last-of-type:border-b-0",
].join(" ");

const DEFAULT_TRAILING_ICON_CLASSNAME =
        "-translate-y-1/2 absolute top-1/2 right-4 size-3 text-co-primary/60 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:text-co-primary";

const DefaultTrailingIcon: React.FC = () => (
        <svg
                aria-hidden="true"
                className={DEFAULT_TRAILING_ICON_CLASSNAME}
                fill="none"
                height="12"
                viewBox="0 0 24 24"
                width="12"
                xmlns="http://www.w3.org/2000/svg"
        >
                <path
                        d="M9 5L16 12L9 19"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                />
        </svg>
);

const buildStatusClassName = (
        tone: ConversationButtonStatusTone,
        customClassName?: string | ((tone: ConversationButtonStatusTone) => string),
) => {
        const resolvedCustomClassName =
                typeof customClassName === "function"
                        ? customClassName(tone)
                        : customClassName;

        return [
                "mr-6 inline-flex items-center rounded px-2 py-0.5 font-medium text-[9px] uppercase",
                STATUS_TONE_CLASS_MAP[tone],
                resolvedCustomClassName,
        ]
                .filter(Boolean)
                .join(" ");
};

const buildAvatar = (assignedAgent?: ConversationButtonAssignedAgent, avatar?: React.ReactNode) => {
        if (avatar) {
                return avatar;
        }

        const image = assignedAgent?.image;
        const name = assignedAgent?.name ?? "";

        return (
                <Avatar className="flex size-8 flex-shrink-0 items-center justify-center overflow-clip rounded-full bg-co-background-200 dark:bg-co-background-500">
                        {image ? <AvatarImage alt={name} src={image} /> : null}
                        <AvatarFallback className="font-medium text-xs" name={name} />
                </Avatar>
        );
};

function ConversationButtonInner<
        Extra extends Record<string, unknown> = Record<string, never>,
>(
        {
                title,
                lastMessage,
                status,
                statusTone = "neutral",
                assignedAgent,
                isTyping = false,
                typingIndicator,
                trailingIcon,
                statusBadge,
                statusClassName,
                avatar,
                className,
                render,
                asChild = false,
                state: providedState,
                type,
                ...props
        }: ConversationButtonProps<Extra>,
        ref: React.Ref<HTMLButtonElement>,
): React.ReactElement | null {
        const baseState: ConversationButtonStateBase = {
                title,
                lastMessageText: lastMessage,
                assignedAgent,
                isTyping,
                status,
                statusTone,
        };

        const mergedState = {
                ...baseState,
                ...(providedState as Partial<ConversationButtonState<Extra>> | undefined),
        } as ConversationButtonState<Extra>;

        const showTypingIndicator = Boolean(isTyping && typingIndicator);
        const bodyContent = showTypingIndicator ? (
                typingIndicator
        ) : (
                <>
                        <div className="flex max-w-[90%] items-center justify-between gap-2">
                                <h3 className="truncate font-medium text-co-primary text-sm">{title}</h3>
                        </div>
                        {lastMessage ? (
                                <p className="text-co-primary/60 text-xs">{lastMessage}</p>
                        ) : null}
                </>
        );

        const statusElement = statusBadge
                ? statusBadge
                : status
                        ? (
                                  <div className={buildStatusClassName(statusTone, statusClassName)}>
                                          {status}
                                  </div>
                          )
                        : null;

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
                                className: BASE_BUTTON_CLASSNAME,
                                children: (
                                        <>
                                                {buildAvatar(assignedAgent, avatar)}
                                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">{bodyContent}</div>
                                                {statusElement}
                                                {trailingIcon ?? <DefaultTrailingIcon />}
                                        </>
                                ),
                        },
                },
        );
}

const ConversationButtonBase = React.forwardRef(ConversationButtonInner) as <
        Extra extends Record<string, unknown> = Record<string, never>,
>(
        props: ConversationButtonProps<Extra> & React.RefAttributes<HTMLButtonElement>,
) => React.ReactElement | null;

ConversationButtonBase.displayName = "ConversationButton";

export { ConversationButtonBase as ConversationButton };
