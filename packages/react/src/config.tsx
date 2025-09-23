"use client";

import * as React from "react";
import { type DefaultMessage, useSupport } from "./provider";

export type Props = {
	defaultMessages?: DefaultMessage[];
	quickOptions?: string[];
};

/**
 * Couples provider state with static configuration so host apps can declare
 * canned greetings or quick reply chips. Whenever `defaultMessages` or
 * `quickOptions` change the values propagate through the support context.
 */
export const SupportConfig = ({ defaultMessages, quickOptions }: Props) => {
	const { setDefaultMessages, setQuickOptions } = useSupport();

	// Only update when the arrays actually change content
	React.useEffect(() => {
		if (defaultMessages) {
			setDefaultMessages(defaultMessages);
		}
	}, [defaultMessages, setDefaultMessages]);

	React.useEffect(() => {
		if (quickOptions) {
			setQuickOptions(quickOptions);
		}
	}, [quickOptions, setQuickOptions]);

	return null;
};

SupportConfig.displayName = "SupportConfig";

// Preserve previous named export for downstream imports.
export type SupportConfigProps = Props;
