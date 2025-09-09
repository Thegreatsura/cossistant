"use client";

import { useRef } from "react";

type ConversationProps = {
	conversationId: string;
};

export function Conversation({ conversationId }: ConversationProps) {
	const scrollRef = useRef<HTMLDivElement | null>(null);

	return (
		<div className="h-full w-full py-2" ref={scrollRef}>
			<p>Conversation {conversationId}</p>
		</div>
	);
}
