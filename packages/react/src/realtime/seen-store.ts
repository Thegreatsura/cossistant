import {
  applyConversationSeenEvent as applyEvent,
  createSeenStore,
  hydrateConversationSeen as hydrateStore,
  type SeenActorType,
  type SeenEntry,
  type SeenState,
  upsertConversationSeen as upsertStore,
} from "@cossistant/core";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { ConversationSeen } from "@cossistant/types/schemas";
import { useRef, useSyncExternalStore } from "react";

const store = createSeenStore();

type Selector<T> = (state: SeenState) => T;

type EqualityChecker<T> = (previous: T, next: T) => boolean;

function useSelector<TSelected>(
  selector: Selector<TSelected>,
  isEqual: EqualityChecker<TSelected> = Object.is,
): TSelected {
  const selectionRef = useRef<TSelected>(undefined);

  const subscribe = (onStoreChange: () => void) =>
    store.subscribe(() => {
      onStoreChange();
    });

  const snapshot = useSyncExternalStore(
    subscribe,
    store.getState,
    store.getState,
  );

  const selected = selector(snapshot);

  if (
    selectionRef.current === undefined ||
    !isEqual(selectionRef.current, selected)
  ) {
    selectionRef.current = selected;
  }

  return selectionRef.current as TSelected;
}

export function useSeenStore<TSelected>(
  selector: Selector<TSelected>,
  isEqual?: EqualityChecker<TSelected>,
): TSelected {
  return useSelector(selector, isEqual);
}

export function hydrateConversationSeen(
  conversationId: string,
  entries: ConversationSeen[],
) {
  hydrateStore(store, conversationId, entries);
}

export function upsertConversationSeen(options: {
  conversationId: string;
  actorType: SeenActorType;
  actorId: string;
  lastSeenAt: Date;
}) {
  upsertStore(store, {
    ...options,
    lastSeenAt: options.lastSeenAt.toISOString(),
  });
}

export function applyConversationSeenEvent(
  event: RealtimeEvent<"conversationSeen">,
  options?: {
    ignoreVisitorId?: string | null;
    ignoreUserId?: string | null;
    ignoreAiAgentId?: string | null;
  },
) {
  applyEvent(store, event, options);
}
