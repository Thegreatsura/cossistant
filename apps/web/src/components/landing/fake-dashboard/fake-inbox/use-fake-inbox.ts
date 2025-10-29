import type { ConversationHeader } from "@cossistant/types";
import { useEffect, useState } from "react";
import { fakeConversations, fakeNewConversations } from "../data";

export function useFakeInbox() {
	const [conversations, setConversations] =
		useState<ConversationHeader[]>(fakeConversations);

	const resetDemoData = () => {
		setConversations(fakeConversations);
	};

	// Dynamically add new conversations after render to simulate incoming messages
	useEffect(() => {
		const timeouts: NodeJS.Timeout[] = [];

		// Add first new conversation after 3 seconds
		const firstConversation = fakeNewConversations[0];
		if (firstConversation) {
			timeouts.push(
				setTimeout(() => {
					setConversations((prev) => {
						// Check if conversation already exists
						if (prev.some((c) => c.id === firstConversation.id)) {
							return prev;
						}
						// Add to the beginning to simulate newest message
						return [firstConversation, ...prev];
					});
				}, 3000)
			);
		}

		// Add second new conversation after 8 seconds
		const secondConversation = fakeNewConversations[1];
		if (secondConversation) {
			timeouts.push(
				setTimeout(() => {
					setConversations((prev) => {
						// Check if conversation already exists
						if (prev.some((c) => c.id === secondConversation.id)) {
							return prev;
						}
						// Add to the beginning to simulate newest message
						return [secondConversation, ...prev];
					});
				}, 8000)
			);
		}

		// Cleanup timeouts on unmount
		return () => {
			for (const timeout of timeouts) {
				clearTimeout(timeout);
			}
		};
	}, []);

	return {
		conversations,
		resetDemoData,
	};
}
