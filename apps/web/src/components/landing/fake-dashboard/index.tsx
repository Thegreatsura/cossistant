"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLandingAnimationStore } from "@/stores/landing-animation-store";
import { FakeConversation } from "./fake-conversation";
import { useFakeConversation } from "./fake-conversation/use-fake-conversation";
import { FakeInbox } from "./fake-inbox";
import { useFakeInbox } from "./fake-inbox/use-fake-inbox";
import { FakeCentralContainer } from "./fake-layout";
import { FakeNavigationTopbar } from "./fake-navigation-topbar";
import "./fake-dashboard.css";

export function FakeDashboard({ className }: { className?: string }) {
	const currentView = useLandingAnimationStore((state) => state.currentView);
	const isPlaying = useLandingAnimationStore((state) => state.isPlaying);
	const onAnimationComplete = useLandingAnimationStore(
		(state) => state.onAnimationComplete
	);
	const play = useLandingAnimationStore((state) => state.play);
	const reset = useLandingAnimationStore((state) => state.reset);
	const previousViewRef = useRef<typeof currentView>(currentView);

	// Reset and start animation after a short delay to ensure everything is ready
	useEffect(() => {
		reset();
		const timeout = setTimeout(() => {
			play();
		}, 500);
		return () => clearTimeout(timeout);
	}, [reset, play]);

	const [showMouseCursor, setShowMouseCursor] = useState(false);
	const selectView = useLandingAnimationStore((state) => state.selectView);

	const handleMouseClick = () => {
		// Click triggers switch to conversation view
		setShowMouseCursor(false);
		// Small delay to ensure cursor animation completes before switching
		setTimeout(() => {
			selectView("conversation");
		}, 100);
	};

	const inboxHook = useFakeInbox({
		isPlaying: isPlaying && currentView === "inbox",
		// Don't pass onComplete - let the mouse click handle the view switch
		onComplete: undefined,
		onShowMouseCursor:
			currentView === "inbox"
				? () => {
						setShowMouseCursor(true);
					}
				: undefined,
	});

	const conversationHook = useFakeConversation({
		isPlaying: isPlaying && currentView === "conversation",
		onComplete:
			currentView === "conversation" ? onAnimationComplete : undefined,
		initialMessages: inboxHook.inboxMessages,
	});

	// Reset animation data when view changes
	useEffect(() => {
		const wasInbox = previousViewRef.current === "inbox";
		const wasConversation = previousViewRef.current === "conversation";
		const isInbox = currentView === "inbox";
		const isConversation = currentView === "conversation";

		// Only reset if we're actually switching views (not on initial mount)
		if (
			previousViewRef.current !== null &&
			previousViewRef.current !== currentView
		) {
			if (wasInbox && isConversation) {
				// Switching from inbox to conversation - reset inbox
				inboxHook.resetDemoData();
			} else if (wasConversation && isInbox) {
				// Switching from conversation to inbox - reset conversation and ensure inbox can restart
				conversationHook.resetDemoData();
				// Explicitly reset inbox to ensure it can restart
				inboxHook.resetDemoData();
			}
			// Reset mouse cursor when switching views
			setShowMouseCursor(false);
		}
		previousViewRef.current = currentView;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentView]);

	return (
		<div
			className={cn(
				"@container relative flex h-full w-full flex-col overflow-hidden bg-background-100 dark:bg-background",
				className
			)}
		>
			<FakeNavigationTopbar />
			<FakeCentralContainer>
				{currentView === "inbox" ? (
					<FakeInbox
						conversations={inboxHook.conversations}
						onMouseClick={handleMouseClick}
						showMouseCursor={showMouseCursor}
						typingVisitors={inboxHook.typingVisitors}
					/>
				) : (
					<FakeConversation
						conversation={conversationHook.conversation}
						timeline={conversationHook.timelineItems}
						typingVisitors={conversationHook.typingVisitors}
						visitor={conversationHook.visitor}
					/>
				)}
			</FakeCentralContainer>
		</div>
	);
}
