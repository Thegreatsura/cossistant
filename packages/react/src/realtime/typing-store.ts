import { useRef, useSyncExternalStore } from "react";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import {
        applyConversationTypingEvent as applyEvent,
        clearTypingFromMessage as clearFromMessage,
        clearTypingState as clearState,
        createTypingStore,
        setTypingState as setState,
        type ConversationTypingState,
        type TypingActorType,
        type TypingEntry,
        type TypingState,
} from "@cossistant/core";

const store = createTypingStore();

type Selector<T> = (state: TypingState) => T;

type EqualityChecker<T> = (previous: T, next: T) => boolean;

function useSelector<TSelected>(
        selector: Selector<TSelected>,
        isEqual: EqualityChecker<TSelected> = Object.is
): TSelected {
        const selectionRef = useRef<TSelected>();

        const subscribe = (onStoreChange: () => void) =>
                store.subscribe(() => {
                        onStoreChange();
                });

        const snapshot = useSyncExternalStore(
                subscribe,
                store.getState,
                store.getState
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

export function useTypingStore<TSelected>(
        selector: Selector<TSelected>,
        isEqual?: EqualityChecker<TSelected>
): TSelected {
        return useSelector(selector, isEqual);
}

export function setTypingState(options: {
        conversationId: string;
        actorType: TypingActorType;
        actorId: string;
        isTyping: boolean;
        preview?: string | null;
        ttlMs?: number;
}) {
        setState(store, options);
}

export function clearTypingState(options: {
        conversationId: string;
        actorType: TypingActorType;
        actorId: string;
}) {
        clearState(store, options);
}

export function applyConversationTypingEvent(
        event: RealtimeEvent<"CONVERSATION_TYPING">,
        options?: {
                ignoreVisitorId?: string | null;
                ignoreUserId?: string | null;
                ignoreAiAgentId?: string | null;
                ttlMs?: number;
        }
) {
        applyEvent(store, event, options);
}

export function clearTypingFromMessage(
        event: RealtimeEvent<"MESSAGE_CREATED">
) {
        clearFromMessage(store, event);
}

export type {
        ConversationTypingState,
        TypingActorType,
        TypingEntry,
        TypingState,
};
