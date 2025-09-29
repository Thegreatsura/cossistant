import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import { useEffect } from "react";
import { useWebSocket } from "../support/context/websocket";

export type UseRealtimeSupportOptions = {
  onEvent?: (event: RealtimeEvent) => void;
};

export type UseRealtimeSupportResult = {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  send: (event: RealtimeEvent) => void;
  lastMessage: RealtimeEvent | null;
  subscribe: (handler: (event: RealtimeEvent) => void) => () => void;
};

/**
 * Subscribes to websocket updates pushed by the provider-level
 * `WebSocketProvider`. Delegates low-level connection state while optionally
 * invoking the consumer supplied `onEvent` handler for every realtime event.
 */
export function useRealtimeSupport(
  options: UseRealtimeSupportOptions = {}
): UseRealtimeSupportResult {
  const { onEvent } = options;
  const { isConnected, isConnecting, error, send, subscribe, lastMessage } =
    useWebSocket();

  // Subscribe to WebSocket events
  useEffect(() => {
    if (onEvent) {
      const unsubscribe = subscribe(onEvent);

      return unsubscribe;
    }
  }, [onEvent, subscribe]);

  return {
    isConnected,
    isConnecting,
    error,
    send,
    subscribe,
    lastMessage,
  };
}
