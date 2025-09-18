"use client";

import type { RealtimeEvent } from "@cossistant/types";
import { useCallback } from "react";
import { useDashboardRealtime } from "./websocket";

export function DashboardRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    console.log("[Dashboard Realtime] Event received", event);
  }, []);

  const { isConnected: isRealtimeConnected } = useDashboardRealtime({
    onEvent: handleRealtimeEvent,
  });

  return children;
}
