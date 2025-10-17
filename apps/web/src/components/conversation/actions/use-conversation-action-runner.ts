"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useConversationActions } from "@/data/use-conversation-actions";

export type RunConversationActionOptions = {
  successMessage?: string;
  errorMessage?: string;
  beforeAction?: () => void;
};

export type RunConversationAction = (
  action: () => Promise<unknown | boolean>,
  options?: RunConversationActionOptions,
) => Promise<boolean>;

type UseConversationActionRunnerParams = Parameters<
  typeof useConversationActions
>[0];

type UseConversationActionRunnerReturn = ReturnType<
  typeof useConversationActions
> & {
  runAction: RunConversationAction;
};

export function useConversationActionRunner(
  params: UseConversationActionRunnerParams,
): UseConversationActionRunnerReturn {
  const actions = useConversationActions(params);

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
    [],
  );

  return {
    ...actions,
    runAction,
  };
}
