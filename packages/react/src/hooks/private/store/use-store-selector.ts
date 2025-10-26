import { useRef, useSyncExternalStore } from "react";

type Subscription<TState> = (state: TState) => void;

type BasicStore<TState> = {
	getState(): TState;
	subscribe(listener: Subscription<TState>): () => void;
};

/**
 * React hook that bridges Zustand-like stores with React components by
 * memoizing selector results and resubscribing when dependencies change.
 */
export function useStoreSelector<TState, TSelected>(
        store: BasicStore<TState>,
        selector: (state: TState) => TSelected,
        isEqual: (previous: TSelected, next: TSelected) => boolean = Object.is
): TSelected {
	const selectionRef = useRef<TSelected>(undefined);

	const subscribe = (onStoreChange: () => void) =>
		store.subscribe(() => {
			onStoreChange();
		});

	const snapshot = useSyncExternalStore(
		subscribe,
		() => store.getState(),
		() => store.getState()
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
