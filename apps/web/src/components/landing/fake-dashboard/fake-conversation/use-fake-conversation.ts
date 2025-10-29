import { useEffect, useState } from "react";
import type { ConversationTimelineItem } from "@/data/conversation-message-cache";
import {
	createMarcConversation,
	type FakeTypingVisitor,
	marcVisitor,
} from "../data";

const ANTHONY_RIERA_ID = "01JGUSER1111111111111111";
const MARC_VISITOR_ID = "01JGVIS22222222222222222";
const CONVERSATION_ID = "01JGAA2222222222222222222";

// Helper to simulate character-by-character typing preview
const createTypingPreview = (fullText: string, progress: number): string => {
	const charsToShow = Math.floor((fullText.length * progress) / 100);
	return fullText.slice(0, charsToShow);
};

export function useFakeConversation() {
	const conversation = createMarcConversation(
		"Hey! The widget isn't loading on my production site. It works fine locally though.",
		new Date()
	);

	const [timelineItems, setTimelineItems] = useState<
		ConversationTimelineItem[]
	>([]);
	const [typingVisitors, setTypingVisitors] = useState<FakeTypingVisitor[]>([]);

	const resetDemoData = () => {
		setTimelineItems([]);
		setTypingVisitors([]);
	};

	// Simulate the full conversation timeline with messages and events
	useEffect(() => {
		const timeouts: NodeJS.Timeout[] = [];
		const now = new Date();

		// Helper to create a message timeline item
		const createMessage = (params: {
			id: string;
			text: string;
			userId: string | null;
			visitorId: string | null;
			timestamp: Date;
		}): ConversationTimelineItem => ({
			id: params.id,
			conversationId: CONVERSATION_ID,
			organizationId: "01JGORG11111111111111111",
			visibility: "public" as const,
			type: "message" as const,
			text: params.text,
			parts: [{ type: "text" as const, text: params.text }],
			userId: params.userId,
			visitorId: params.visitorId,
			aiAgentId: null,
			createdAt: params.timestamp.toISOString(),
			deletedAt: null,
		});

		// Helper to create an event timeline item
		const createEvent = (
			id: string,
			eventType: string,
			actorUserId: string | null,
			timestamp: Date
		): ConversationTimelineItem => ({
			id,
			conversationId: CONVERSATION_ID,
			organizationId: "01JGORG11111111111111111",
			visibility: "public" as const,
			type: "event" as const,
			text: null,
			parts: [
				{
					type: "event" as const,
					eventType,
					actorUserId,
					actorAiAgentId: null,
					data: {},
				},
			],
			userId: null,
			visitorId: null,
			aiAgentId: null,
			createdAt: timestamp.toISOString(),
			deletedAt: null,
		});

		// 1. Marc's first message appears immediately
		const firstMessage = createMessage({
			id: "01JGTIM22222222222222222",
			text: "Hey! The widget isn't loading on my production site. It works fine locally though.",
			userId: null,
			visitorId: MARC_VISITOR_ID,
			timestamp: new Date(now.getTime()),
		});
		setTimelineItems([firstMessage]);

		// 2. Anthony joins the conversation after 1.5 seconds
		timeouts.push(
			setTimeout(() => {
				const joinedEvent = createEvent(
					"01JGEVE22222222222222221",
					"participant_joined",
					ANTHONY_RIERA_ID,
					new Date(now.getTime() + 1500)
				);
				setTimelineItems((prev) => [...prev, joinedEvent]);
			}, 1500)
		);

		// 3. Anthony's first response after 2.5 seconds
		timeouts.push(
			setTimeout(() => {
				const anthonyMessage = createMessage({
					id: "01JGTIM22222222222222223",
					text: "Hi Marc! I'll help you with that.",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 2500),
				});
				setTimelineItems((prev) => [...prev, anthonyMessage]);
			}, 2500)
		);

		// 3b. Anthony's second message after 3.5 seconds (grouped with first)
		timeouts.push(
			setTimeout(() => {
				const anthonyMessage2 = createMessage({
					id: "01JGTIM22222222222222228",
					text: "Can you share your domain so I can check the configuration?",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 3500),
				});
				setTimelineItems((prev) => [...prev, anthonyMessage2]);
			}, 3500)
		);

		// 4. Marc starts typing second message (with preview) after 4 seconds
		const secondMessageText =
			"I checked the console and I'm getting a CORS error. Is there something I need to configure?";
		const typingDuration = 2000; // 2 seconds of typing
		const typingSteps = 10;
		const typingInterval = typingDuration / typingSteps;

		for (let step = 1; step <= typingSteps; step++) {
			timeouts.push(
				setTimeout(
					() => {
						setTypingVisitors([
							{
								conversationId: CONVERSATION_ID,
								visitorId: MARC_VISITOR_ID,
								preview: createTypingPreview(
									secondMessageText,
									(step / typingSteps) * 100
								),
							},
						]);
					},
					4000 + step * typingInterval
				)
			);
		}

		// 5. Marc sends second message after 6 seconds
		timeouts.push(
			setTimeout(() => {
				setTypingVisitors([]);
				const secondMessage = createMessage({
					id: "01JGTIM22222222222222224",
					text: secondMessageText,
					userId: null,
					visitorId: MARC_VISITOR_ID,
					timestamp: new Date(now.getTime() + 6000),
				});
				setTimelineItems((prev) => [...prev, secondMessage]);
			}, 6000)
		);

		// 6. Anthony's third response after 7.5 seconds
		timeouts.push(
			setTimeout(() => {
				const anthonyMessage3 = createMessage({
					id: "01JGTIM22222222222222225",
					text: "CORS errors usually mean the domain isn't added to your allowed origins.",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 7500),
				});
				setTimelineItems((prev) => [...prev, anthonyMessage3]);
			}, 7500)
		);

		// 6b. Anthony's fourth message after 8.5 seconds (grouped with third)
		timeouts.push(
			setTimeout(() => {
				const anthonyMessage4 = createMessage({
					id: "01JGTIM22222222222222229",
					text: "Let me check your settings real quick.",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 8500),
				});
				setTimelineItems((prev) => [...prev, anthonyMessage4]);
			}, 8500)
		);

		// 7. Marc starts typing third message (with preview) after 10 seconds
		const thirdMessageText =
			"Also tried checking the API key but it looks correct. Any ideas?";

		for (let step = 1; step <= typingSteps; step++) {
			timeouts.push(
				setTimeout(
					() => {
						setTypingVisitors([
							{
								conversationId: CONVERSATION_ID,
								visitorId: MARC_VISITOR_ID,
								preview: createTypingPreview(
									thirdMessageText,
									(step / typingSteps) * 100
								),
							},
						]);
					},
					10_000 + step * typingInterval
				)
			);
		}

		// 8. Marc sends third message after 12 seconds
		timeouts.push(
			setTimeout(() => {
				setTypingVisitors([]);
				const thirdMessage = createMessage({
					id: "01JGTIM22222222222222226",
					text: thirdMessageText,
					userId: null,
					visitorId: MARC_VISITOR_ID,
					timestamp: new Date(now.getTime() + 12_000),
				});
				setTimelineItems((prev) => [...prev, thirdMessage]);
			}, 12_000)
		);

		// 9. Anthony's fifth response after 13.5 seconds
		timeouts.push(
			setTimeout(() => {
				const anthonyMessage5 = createMessage({
					id: "01JGTIM22222222222222227",
					text: "I found the issue - I've added your domain to the allowed origins.",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 13_500),
				});
				setTimelineItems((prev) => [...prev, anthonyMessage5]);
			}, 13_500)
		);

		// 9b. Anthony's sixth message after 14.5 seconds (grouped with fifth)
		timeouts.push(
			setTimeout(() => {
				const anthonyMessage6 = createMessage({
					id: "01JGTIM22222222222222230",
					text: "Can you try refreshing your site?",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 14_500),
				});
				setTimelineItems((prev) => [...prev, anthonyMessage6]);
			}, 14_500)
		);

		// Cleanup timeouts on unmount
		return () => {
			for (const timeout of timeouts) {
				clearTimeout(timeout);
			}
		};
	}, []);

	return {
		conversation,
		timelineItems,
		visitor: marcVisitor,
		resetDemoData,
		typingVisitors,
	};
}
