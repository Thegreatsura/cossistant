"use client";

import {
  createSupportStore,
  type SupportConfig,
  type SupportStore,
  type SupportStoreState,
} from "@cossistant/core";
import { useMemo, useRef, useSyncExternalStore } from "react";

const storage = typeof window !== "undefined" ? window.localStorage : undefined;
const store = createSupportStore({ storage });

type Selector<T> = (state: SupportStoreState) => T;

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

export type UseSupportStoreResult = SupportStoreState &
  Pick<
    SupportStore,
    | "navigate"
    | "replace"
    | "goBack"
    | "open"
    | "close"
    | "toggle"
    | "updateConfig"
    | "reset"
  >;

export function useSupportStore(): UseSupportStoreResult {
  const state = useSelector((current) => current);

  return useMemo(
    () => ({
      ...state,
      navigate: store.navigate,
      replace: store.replace,
      goBack: store.goBack,
      open: store.open,
      close: store.close,
      toggle: store.toggle,
      updateConfig: store.updateConfig,
      reset: store.reset,
    }),
    [state],
  );
}

export const useSupportConfig = () => {
  const config = useSelector((state) => state.config);

  return useMemo(
    () => ({
      ...config,
      open: store.open,
      close: store.close,
      toggle: store.toggle,
    }),
    [config],
  );
};

export const useSupportNavigation = () => {
  const navigation = useSelector((state) => state.navigation);
  const { current, previousPages } = navigation;

  return useMemo(
    () => ({
      current,
      page: current.page,
      params: current.params,
      previousPages,
      navigate: store.navigate,
      replace: store.replace,
      goBack: store.goBack,
      canGoBack: previousPages.length > 0,
    }),
    [current, previousPages],
  );
};

export const initializeSupportStore = (props: {
  mode?: SupportConfig["mode"];
  size?: SupportConfig["size"];
  defaultOpen?: boolean;
}) => {
  const patch: Partial<SupportConfig> = {};

  if (props.mode !== undefined) {
    patch.mode = props.mode;
  }

  if (props.size !== undefined) {
    patch.size = props.size;
  }

  if (props.defaultOpen !== undefined) {
    patch.isOpen = props.defaultOpen;
  }

  if (Object.keys(patch).length > 0) {
    store.updateConfig(patch);
  }
};
