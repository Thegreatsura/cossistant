import { useRef, useSyncExternalStore } from "react";

type Subscription<TState> = (state: TState) => void;

type BasicStore<TState> = {
	getState(): TState;
	subscribe(listener: Subscription<TState>): () => void;
};

// No-op subscribe function for null store case
const noopSubscribe = () => () => {};

/**
 * React hook that bridges Zustand-like stores with React components by
 * memoizing selector results and resubscribing when dependencies change.
 *
 * Overloaded to support both nullable and non-nullable stores.
 */
export function useStoreSelector<TState, TSelected>(
	store: BasicStore<TState>,
	selector: (state: TState) => TSelected,
	isEqual?: (previous: TSelected, next: TSelected) => boolean
): TSelected;

export function useStoreSelector<TState, TSelected>(
	store: BasicStore<TState> | null,
	selector: (state: TState | null) => TSelected,
	isEqual?: (previous: TSelected, next: TSelected) => boolean
): TSelected;

export function useStoreSelector<TState, TSelected>(
	store: BasicStore<TState> | null,
	selector: (state: TState | null) => TSelected,
	isEqual: (previous: TSelected, next: TSelected) => boolean = Object.is
): TSelected {
	const selectionRef = useRef<TSelected>(undefined);

	// Create stable subscribe function
	const subscribe = store
		? (onStoreChange: () => void) => store.subscribe(() => onStoreChange())
		: noopSubscribe;

	// Create stable getSnapshot function
	const getSnapshot = store ? () => store.getState() : () => null;

	// Always call useSyncExternalStore unconditionally
	const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	const selected = selector(snapshot);

	if (
		selectionRef.current === undefined ||
		!isEqual(selectionRef.current, selected)
	) {
		selectionRef.current = selected;
	}

	return selectionRef.current as TSelected;
}
