import type { CossistantClient } from "@cossistant/core";
import { useCallback, useEffect, useRef } from "react";

const PREVIEW_MAX_LENGTH = 2000;
const SEND_INTERVAL_MS = 800;
const KEEP_ALIVE_MS = 4000;
const STOP_TYPING_DELAY_MS = 2000; // Send isTyping: false after 2 seconds of inactivity

type UseVisitorTypingReporterOptions = {
  client: CossistantClient | null;
  conversationId: string | null;
};

type UseVisitorTypingReporterResult = {
  handleInputChange: (value: string) => void;
  handleSubmit: () => void;
  stop: () => void;
};

export function useVisitorTypingReporter({
  client,
  conversationId,
}: UseVisitorTypingReporterOptions): UseVisitorTypingReporterResult {
  const typingActiveRef = useRef(false);
  const lastSentAtRef = useRef(0);
  const latestPreviewRef = useRef<string>("");
  const keepAliveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const clearKeepAlive = useCallback(() => {
    if (keepAliveTimeoutRef.current) {
      clearTimeout(keepAliveTimeoutRef.current);
      keepAliveTimeoutRef.current = null;
    }
  }, []);

  const clearStopTypingTimeout = useCallback(() => {
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
      stopTypingTimeoutRef.current = null;
    }
  }, []);

  const sendTyping = useCallback(
    async (isTyping: boolean, preview?: string | null) => {
      if (!(client && conversationId)) {
        return;
      }

      try {
        await client.setVisitorTyping({
          conversationId,
          isTyping,
          visitorPreview: preview ?? undefined,
        });
      } catch (error) {
        console.error("[Support] Failed to send typing event", error);
      }
    },
    [client, conversationId]
  );

  const scheduleKeepAlive = useCallback(() => {
    clearKeepAlive();
    keepAliveTimeoutRef.current = setTimeout(() => {
      if (typingActiveRef.current) {
        void sendTyping(true, latestPreviewRef.current);
        scheduleKeepAlive();
      }
    }, KEEP_ALIVE_MS);
  }, [clearKeepAlive, sendTyping]);

  const scheduleStopTyping = useCallback(() => {
    clearStopTypingTimeout();
    stopTypingTimeoutRef.current = setTimeout(() => {
      if (typingActiveRef.current) {
        typingActiveRef.current = false;
        clearKeepAlive();
        void sendTyping(false);
      }
    }, STOP_TYPING_DELAY_MS);
  }, [clearStopTypingTimeout, clearKeepAlive, sendTyping]);

  const handleInputChange = useCallback(
    (value: string) => {
      if (!(client && conversationId)) {
        return;
      }

      const trimmed = value.trim();
      latestPreviewRef.current = trimmed.slice(0, PREVIEW_MAX_LENGTH);
      const now = Date.now();

      if (trimmed.length === 0) {
        if (typingActiveRef.current) {
          typingActiveRef.current = false;
          lastSentAtRef.current = now;
          clearKeepAlive();
          clearStopTypingTimeout();
          void sendTyping(false);
        }
        return;
      }

      // Schedule auto-stop after inactivity
      scheduleStopTyping();

      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        lastSentAtRef.current = now;
        void sendTyping(true, latestPreviewRef.current);
        scheduleKeepAlive();
        return;
      }

      if (now - lastSentAtRef.current >= SEND_INTERVAL_MS) {
        lastSentAtRef.current = now;
        void sendTyping(true, latestPreviewRef.current);
        scheduleKeepAlive();
      }
    },
    [
      client,
      conversationId,
      sendTyping,
      scheduleKeepAlive,
      scheduleStopTyping,
      clearKeepAlive,
      clearStopTypingTimeout,
    ]
  );

  const handleSubmit = useCallback(() => {
    if (!typingActiveRef.current) {
      return;
    }

    typingActiveRef.current = false;
    lastSentAtRef.current = Date.now();
    clearKeepAlive();
    clearStopTypingTimeout();
    void sendTyping(false);
  }, [clearKeepAlive, clearStopTypingTimeout, sendTyping]);

  const stop = useCallback(() => {
    if (!typingActiveRef.current) {
      return;
    }

    typingActiveRef.current = false;
    lastSentAtRef.current = Date.now();
    clearKeepAlive();
    clearStopTypingTimeout();
    void sendTyping(false);
  }, [clearKeepAlive, clearStopTypingTimeout, sendTyping]);

  useEffect(() => {
    return () => {
      if (typingActiveRef.current) {
        void sendTyping(false);
      }
      clearKeepAlive();
      clearStopTypingTimeout();
    };
  }, [clearKeepAlive, clearStopTypingTimeout, sendTyping]);

  return {
    handleInputChange,
    handleSubmit,
    stop,
  };
}
