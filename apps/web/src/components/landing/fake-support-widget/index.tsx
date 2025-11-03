"use client";

import * as Primitive from "@cossistant/react/primitives";
import {
	Bubble,
	Container,
	ConversationTimelineList,
} from "@cossistant/react/support/components";
import { AvatarStack } from "@cossistant/react/support/components/avatar-stack";
import { Button } from "@cossistant/react/support/components/button";
import Icon from "@cossistant/react/support/components/icons";
import { Watermark } from "@cossistant/react/support/components/watermark";
// Text component uses real hooks, so we'll create a simple fake version
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { useEffect, useState } from "react";
import { useViewportVisibility } from "@/hooks/use-viewport-visibility";
import { cn } from "@/lib/utils";
import { useLandingAnimationStore } from "@/stores/landing-animation-store";
import { FakeBubble } from "./fake-bubble";
import { FakeSupportProvider, useFakeSupport } from "./fake-support-context";
import {
	FakeSupportStoreProvider,
	useFakeSupportConfig,
} from "./fake-support-store";
import { FakeSupportTextProvider, useSupportText } from "./fake-support-text";
import { useFakeSupportWidget } from "./use-fake-support-widget";

/**
 * Fake Header component that mimics the real Header but uses fake hooks
 */
function FakeHeader({
	children,
	onGoBack,
}: {
	children: React.ReactNode;
	onGoBack?: () => void;
}) {
	const { close } = useFakeSupportConfig();

	return (
		<div className="absolute inset-x-0 top-0 z-10 h-18">
			<div className="absolute inset-0 z-10 flex items-center justify-between gap-3 px-4">
				<div className="flex flex-1 items-center gap-3">
					{onGoBack && (
						<Button
							onClick={onGoBack}
							size="icon"
							type="button"
							variant="ghost"
						>
							<Icon name="arrow-left" />
						</Button>
					)}
					{children}
				</div>
				<Button onClick={close} size="icon" type="button" variant="ghost">
					<Icon name="close" />
				</Button>
			</div>
		</div>
	);
}

/**
 * Fake conversation view that manually renders the conversation structure
 * using real components but with fake hooks/data.
 */
function FakeConversationView({
	conversationId,
	timelineItems,
}: {
	conversationId: string;
	timelineItems: TimelineItem[];
}) {
	const { website, availableAIAgents, availableHumanAgents, visitor } =
		useFakeSupport();
	const text = useSupportText();
	const [message, setMessage] = useState("");

	const handleGoBack = () => {
		// Back button does nothing in fake demo
	};

	return (
		<div className="flex h-full flex-col gap-0 overflow-hidden">
			<FakeHeader onGoBack={handleGoBack}>
				<div className="flex w-full items-center justify-between gap-2 py-3">
					<div className="flex flex-col">
						<p className="font-medium text-sm">{website?.name}</p>
						<p className="text-muted-foreground text-sm">
							{text("common.labels.supportOnline")}
						</p>
					</div>
					<AvatarStack
						aiAgents={availableAIAgents}
						gapWidth={2}
						humanAgents={availableHumanAgents}
						size={32}
						spacing={28}
					/>
				</div>
			</FakeHeader>

			<ConversationTimelineList
				availableAIAgents={availableAIAgents}
				availableHumanAgents={availableHumanAgents}
				className="min-h-0 flex-1 px-4 py-20"
				conversationId={conversationId}
				currentVisitorId={visitor?.id}
				items={timelineItems}
			/>

			<div className="shrink-0 p-1">
				<form className="flex flex-col gap-2">
					<div className="flex flex-col rounded border border-co-border/50 bg-co-background-100 dark:bg-co-background-200">
						<Primitive.MultimodalInput
							className={cn(
								"flex-1 resize-none overflow-hidden p-3 text-co-foreground text-sm placeholder:text-primary/40 focus-visible:outline-none"
							)}
							disabled={true}
							onChange={setMessage}
							placeholder={text("component.multimodalInput.placeholder")}
							value={message}
						/>
						<div className="flex items-center justify-between py-1 pr-1 pl-3">
							<Watermark />
							<div className="flex items-center gap-0.5">
								<button
									className="group flex h-8 w-8 items-center justify-center rounded-md text-co-muted-foreground hover:bg-co-muted hover:text-co-foreground disabled:cursor-not-allowed disabled:opacity-50"
									disabled={true}
									type="button"
								>
									<Icon className="h-4 w-4" name="send" />
								</button>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}

/**
 * Main fake support widget component.
 *
 * Reuses real support components (Bubble, Container, Header, AvatarStack,
 * ConversationTimelineList, MultimodalInput) but provides fake data via
 * isolated fake providers.
 */
export function FakeSupportWidget({ className }: { className?: string }) {
	const isPlaying = useLandingAnimationStore((state) => state.isPlaying);
	const isRestarting = useLandingAnimationStore((state) => state.isRestarting);
	const onAnimationComplete = useLandingAnimationStore(
		(state) => state.onAnimationComplete
	);
	const [widgetRef, isVisible] = useViewportVisibility<HTMLDivElement>({
		threshold: 0.1,
		rootMargin: "50px",
	});

	const widgetData = useFakeSupportWidget({
		isPlaying: isPlaying && isVisible,
		onComplete: onAnimationComplete,
	});

	const conversationId = widgetData.conversation.id;

	// Reset animation data when restarting
	useEffect(() => {
		if (isRestarting) {
			widgetData.resetDemoData();
		}
	}, [isRestarting, widgetData]);

	return (
		<div
			className={cn(
				"flex h-full w-full items-center justify-center",
				className
			)}
			ref={widgetRef}
		>
			<FakeSupportProvider>
				<FakeSupportTextProvider>
					<FakeSupportStoreProvider conversationId={conversationId}>
						<div className="relative flex flex-col items-end gap-4 py-10">
							<div className="relative flex h-[550px] w-[360px] flex-col overflow-hidden rounded-lg border border-co-border bg-co-background">
								<FakeConversationView
									conversationId={conversationId}
									timelineItems={widgetData.timelineItems as TimelineItem[]}
								/>
							</div>
							<FakeBubble
								className="opacity-50"
								isOpen={true}
								isTyping={false}
							/>
						</div>
					</FakeSupportStoreProvider>
				</FakeSupportTextProvider>
			</FakeSupportProvider>
		</div>
	);
}
