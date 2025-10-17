export const PRESENCE_ONLINE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export const PRESENCE_AWAY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export const PRESENCE_PING_INTERVAL_MS = Math.max(
  60_000,
  PRESENCE_ONLINE_WINDOW_MS - 60_000,
);
