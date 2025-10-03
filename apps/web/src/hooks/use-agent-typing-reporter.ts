import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useTRPC } from "@/lib/trpc/client";

const SEND_INTERVAL_MS = 800;
const KEEP_ALIVE_MS = 4000;

type UseAgentTypingReporterOptions = {
  conversationId: string | null;
  websiteSlug: string;
  enabled?: boolean;
};

type UseAgentTypingReporterResult = {
  handleInputChange: (value: string) => void;
  handleSubmit: () => void;
  stop: () => void;
};

export function useAgentTypingReporter({
  conversationId,
  websiteSlug,
  enabled = true,
}: UseAgentTypingReporterOptions): UseAgentTypingReporterResult {
  const trpc = useTRPC();
  const typingActiveRef = useRef(false);
  const lastSentAtRef = useRef(0);
  const keepAliveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const { mutateAsync: sendTypingMutation } = useMutation(
    trpc.conversation.setTyping.mutationOptions()
  );

  const clearKeepAlive = useCallback(() => {
    if (keepAliveTimeoutRef.current) {
      clearTimeout(keepAliveTimeoutRef.current);
      keepAliveTimeoutRef.current = null;
    }
  }, []);

  const sendTyping = useCallback(
    async (isTyping: boolean) => {
      if (!(enabled && conversationId && websiteSlug)) {
        return;
      }

      try {
        await sendTypingMutation({
          conversationId,
          websiteSlug,
          isTyping,
        });
      } catch (error) {
        console.error("[Dashboard] Failed to send typing event", error);
      }
    },
    [enabled, conversationId, websiteSlug, sendTypingMutation]
  );

  const scheduleKeepAlive = useCallback(() => {
    clearKeepAlive();
    keepAliveTimeoutRef.current = setTimeout(() => {
      if (typingActiveRef.current) {
        void sendTyping(true);
        scheduleKeepAlive();
      }
    }, KEEP_ALIVE_MS);
  }, [clearKeepAlive, sendTyping]);

  const handleInputChange = useCallback(
    (value: string) => {
      if (!(enabled && conversationId && websiteSlug)) {
        return;
      }

      const trimmed = value.trim();
      const now = Date.now();

      if (trimmed.length === 0) {
        if (typingActiveRef.current) {
          typingActiveRef.current = false;
          lastSentAtRef.current = now;
          clearKeepAlive();
          void sendTyping(false);
        }
        return;
      }

      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        lastSentAtRef.current = now;
        void sendTyping(true);
        scheduleKeepAlive();
        return;
      }

      if (now - lastSentAtRef.current >= SEND_INTERVAL_MS) {
        lastSentAtRef.current = now;
        void sendTyping(true);
        scheduleKeepAlive();
      }
    },
    [
      enabled,
      conversationId,
      websiteSlug,
      sendTyping,
      scheduleKeepAlive,
      clearKeepAlive,
    ]
  );

  const handleSubmit = useCallback(() => {
    if (!typingActiveRef.current) {
      return;
    }

    typingActiveRef.current = false;
    lastSentAtRef.current = Date.now();
    clearKeepAlive();
    void sendTyping(false);
  }, [clearKeepAlive, sendTyping]);

  const stop = useCallback(() => {
    if (!typingActiveRef.current) {
      return;
    }

    typingActiveRef.current = false;
    lastSentAtRef.current = Date.now();
    clearKeepAlive();
    void sendTyping(false);
  }, [clearKeepAlive, sendTyping]);

  useEffect(() => {
    return () => {
      if (typingActiveRef.current) {
        void sendTyping(false);
      }
      clearKeepAlive();
    };
  }, [clearKeepAlive, sendTyping]);

  return {
    handleInputChange,
    handleSubmit,
    stop,
  };
}
