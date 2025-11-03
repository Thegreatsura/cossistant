"use client";

import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useLandingAnimationStore } from "@/stores/landing-animation-store";

export function AnimationControls() {
	const currentView = useLandingAnimationStore((state) => state.currentView);
	const isPlaying = useLandingAnimationStore((state) => state.isPlaying);
	const selectView = useLandingAnimationStore((state) => state.selectView);
	const play = useLandingAnimationStore((state) => state.play);
	const pause = useLandingAnimationStore((state) => state.pause);

	const handleInboxClick = () => {
		selectView("inbox");
		play();
	};

	const handleConversationClick = () => {
		selectView("conversation");
		play();
	};

	const handlePlayPauseClick = () => {
		if (isPlaying) {
			pause();
		} else {
			play();
		}
	};

	return (
		<div className="hidden w-max gap-2 lg:flex">
			<Button
				className={cn(
					"border-primary/10 border-dashed bg-background-200 dark:bg-background-400",
					currentView === "inbox" && "ring-2 ring-primary/20"
				)}
				onClick={handleInboxClick}
				size="sm"
				type="button"
				variant="outline"
			>
				Support inbox
			</Button>
			<Button
				className={cn(
					currentView === "conversation" && "ring-2 ring-primary/20"
				)}
				onClick={handleConversationClick}
				size="sm"
				type="button"
				variant="secondary"
			>
				Real-time conversation
			</Button>
			<Button
				className="size-8"
				onClick={handlePlayPauseClick}
				size="icon"
				type="button"
				variant="secondary"
			>
				<Icon
					className="size-4"
					filledOnHover
					name={isPlaying ? "pause" : "play"}
				/>
			</Button>
		</div>
	);
}
