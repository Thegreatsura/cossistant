"use client";

import type {
	DefaultMessage as DefaultMessageValue,
	SenderType,
} from "@cossistant/types";
import * as React from "react";
import { useSupport } from "./provider";

export type DefaultMessageProps = {
	content: string;
	senderType: SenderType;
	senderId?: string;
};

/**
 * Declarative message entry for `SupportConfig`.
 *
 * @example
 * <SupportConfig>
 *   <DefaultMessage senderType="team_member" content="How can we help?" />
 * </SupportConfig>
 */
export function DefaultMessage(
	_props: DefaultMessageProps
): React.ReactElement | null {
	return null;
}

DefaultMessage.displayName = "DefaultMessage";

function isDefaultMessageElement(
	value: React.ReactNode
): value is React.ReactElement<DefaultMessageProps> {
	return React.isValidElement(value) && value.type === DefaultMessage;
}

export function extractDefaultMessagesFromChildren(
	children: React.ReactNode
): DefaultMessageValue[] {
	const messages: DefaultMessageValue[] = [];

	const collect = (node: React.ReactNode) => {
		React.Children.forEach(node, (child) => {
			if (!child) {
				return;
			}

			if (!React.isValidElement(child)) {
				return;
			}

			if (child.type === React.Fragment) {
				const fragmentProps = child.props as { children?: React.ReactNode };
				collect(fragmentProps.children);
				return;
			}

			if (!isDefaultMessageElement(child)) {
				return;
			}

			const { content, senderType, senderId } = child.props;
			if (!content) {
				return;
			}

			messages.push({
				content,
				senderId,
				senderType,
			});
		});
	};

	collect(children);
	return messages;
}

export function resolveSupportConfigMessages({
	children,
	defaultMessages,
}: {
	children?: React.ReactNode;
	defaultMessages?: DefaultMessageValue[];
}): DefaultMessageValue[] | undefined {
	if (defaultMessages !== undefined) {
		return defaultMessages;
	}

	const childMessages = extractDefaultMessagesFromChildren(children);
	return childMessages.length ? childMessages : undefined;
}

export type SupportConfigProps = {
	defaultMessages?: DefaultMessageValue[];
	quickOptions?: string[];
	children?: React.ReactNode;
};

/**
 * Component exposed by Cossistant allowing you to change the support widget default messages and quick response whenever rendered.
 */
export const SupportConfig = ({
	defaultMessages,
	quickOptions,
	children,
}: SupportConfigProps): React.ReactElement | null => {
	const { setDefaultMessages, setQuickOptions } = useSupport();

	const resolvedDefaultMessages = React.useMemo(
		() => resolveSupportConfigMessages({ children, defaultMessages }),
		[children, defaultMessages]
	);

	React.useEffect(() => {
		if (resolvedDefaultMessages) {
			setDefaultMessages(resolvedDefaultMessages);
		}
	}, [resolvedDefaultMessages, setDefaultMessages]);

	React.useEffect(() => {
		if (quickOptions) {
			setQuickOptions(quickOptions);
		}
	}, [quickOptions, setQuickOptions]);

	return null;
};

SupportConfig.displayName = "SupportConfig";
