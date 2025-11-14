"use client";

import { ConversationStatus } from "@cossistant/types";
import { useCallback } from "react";
import { toast } from "sonner";
import { useOptionalInboxes } from "@/contexts/inboxes";
import { useConversationActions } from "@/data/use-conversation-actions";

export type RunConversationActionOptions = {
	successMessage?: string;
	errorMessage?: string;
	beforeAction?: () => void;
};

export type RunConversationAction = (
        action: () => Promise<unknown | boolean>,
        options?: RunConversationActionOptions
) => Promise<boolean>;

type UseConversationActionRunnerParams = Parameters<
        typeof useConversationActions
>[0];

type UseConversationActionRunnerReturn = ReturnType<
        typeof useConversationActions
> & {
        runAction: RunConversationAction;
};

type InboxFilter = "open" | "resolved" | "spam" | "archived";

type NavigationAwareAction =
        | "markResolved"
        | "markOpen"
        | "markSpam"
        | "markNotSpam"
        | "markArchived"
        | "markUnarchived";

type NavigationCallback = (() => void) | null;

function resolveInboxFilter(
        status: ConversationStatus | "archived" | null | undefined
): InboxFilter {
        if (status === "archived") {
                return "archived";
        }

        switch (status) {
                case ConversationStatus.RESOLVED:
                        return "resolved";
                case ConversationStatus.SPAM:
                        return "spam";
                default:
                        return "open";
        }
}

function getTargetInboxForAction(action: NavigationAwareAction): InboxFilter {
        switch (action) {
                case "markResolved":
                        return "resolved";
                case "markOpen":
                case "markNotSpam":
                case "markUnarchived":
                        return "open";
                case "markSpam":
                        return "spam";
                case "markArchived":
                        return "archived";
                default: {
                        const _exhaustive: never = action;
                        throw new Error(`Unhandled action: ${_exhaustive}`);
                }
        }
}

export function useConversationActionRunner(
        params: UseConversationActionRunnerParams
): UseConversationActionRunnerReturn {
        const inboxes = useOptionalInboxes();
        const actions = useConversationActions(params);

        const {
                markResolved: baseMarkResolved,
                markOpen: baseMarkOpen,
                markSpam: baseMarkSpam,
                markNotSpam: baseMarkNotSpam,
                markArchived: baseMarkArchived,
                markUnarchived: baseMarkUnarchived,
                ...otherActions
        } = actions;

        const shouldNavigateAfterAction = useCallback(
                (action: NavigationAwareAction) => {
                        if (!inboxes) {
                                return false;
                        }

                        if (inboxes.selectedConversationId !== params.conversationId) {
                                return false;
                        }

                        const currentInbox = resolveInboxFilter(
                                inboxes.selectedConversationStatus
                        );
                        const targetInbox = getTargetInboxForAction(action);

                        return currentInbox !== targetInbox;
                },
                [inboxes, params.conversationId]
        );

        const resolveNavigationCallback = useCallback((): NavigationCallback => {
                if (!inboxes) {
                        return null;
                }

                if (inboxes.nextConversation) {
                        return inboxes.navigateToNextConversation;
                }

                if (inboxes.previousConversation) {
                        return inboxes.navigateToPreviousConversation;
                }

                return inboxes.goBack;
        }, [inboxes]);

        const runNavigationAwareAction = useCallback(
                async <T,>(
                        action: () => Promise<T>,
                        actionName: NavigationAwareAction
                ): Promise<T> => {
                        const shouldNavigate = shouldNavigateAfterAction(actionName);
                        const navigationCallback = shouldNavigate
                                ? resolveNavigationCallback()
                                : null;

                        const result = await action();

                        if (navigationCallback) {
                                navigationCallback();
                        }

                        return result;
                },
                [resolveNavigationCallback, shouldNavigateAfterAction]
        );

        const markResolved = useCallback(
                () => runNavigationAwareAction(baseMarkResolved, "markResolved"),
                [baseMarkResolved, runNavigationAwareAction]
        );

        const markOpen = useCallback(
                () => runNavigationAwareAction(baseMarkOpen, "markOpen"),
                [baseMarkOpen, runNavigationAwareAction]
        );

        const markSpam = useCallback(
                () => runNavigationAwareAction(baseMarkSpam, "markSpam"),
                [baseMarkSpam, runNavigationAwareAction]
        );

        const markNotSpam = useCallback(
                () => runNavigationAwareAction(baseMarkNotSpam, "markNotSpam"),
                [baseMarkNotSpam, runNavigationAwareAction]
        );

        const markArchived = useCallback(
                () => runNavigationAwareAction(baseMarkArchived, "markArchived"),
                [baseMarkArchived, runNavigationAwareAction]
        );

        const markUnarchived = useCallback(
                () => runNavigationAwareAction(baseMarkUnarchived, "markUnarchived"),
                [baseMarkUnarchived, runNavigationAwareAction]
        );

        const runAction = useCallback<RunConversationAction>(
                async (action, options) => {
                        const { successMessage, errorMessage, beforeAction } = options ?? {};

			beforeAction?.();

			try {
				const result = await action();

				if (result === false) {
					if (errorMessage) {
						toast.error(errorMessage);
					}

					return false;
				}

				if (successMessage) {
					toast.success(successMessage);
				}

				return true;
			} catch (error) {
				console.error("Failed to run conversation action", error);
				toast.error(errorMessage ?? "Failed to perform conversation action");
				return false;
			}
		},
		[]
	);

        return {
                ...otherActions,
                markResolved,
                markOpen,
                markSpam,
                markNotSpam,
                markArchived,
                markUnarchived,
                runAction,
        };
}
