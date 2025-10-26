"use client";

import type React from "react";
import { useEffect } from "react";
import {
	initializeSupportStore,
	useSupportConfig as useSupportConfigStore,
} from "../store/support-store";

export type SupportConfigSetters = {
	open: () => void;
	close: () => void;
	toggle: () => void;
};

export const useSupportConfig = useSupportConfigStore;

/**
 * Syncs provider props into the shared support store before rendering children.
 */
export const SupportConfigProvider: React.FC<{
	children: React.ReactNode;
	mode?: "floating" | "responsive";
	size?: "normal" | "larger";
	defaultOpen?: boolean;
}> = ({
	children,
	mode = "floating",
	size = "normal",
	defaultOpen = false,
}) => {
	useEffect(() => {
		initializeSupportStore({ mode, size, defaultOpen });
	}, [mode, size, defaultOpen]);

	return <>{children}</>;
};
