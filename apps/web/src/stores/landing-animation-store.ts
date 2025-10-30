import { create } from "zustand";

export type LandingAnimationView = "inbox" | "conversation";

type LandingAnimationState = {
	currentView: LandingAnimationView | null;
	isPlaying: boolean;
	play: () => void;
	pause: () => void;
	selectView: (view: LandingAnimationView) => void;
	onAnimationComplete: () => void;
	reset: () => void;
};

/**
 * Store for controlling landing page animations.
 * Designed to be extensible for future animations.
 */
export const useLandingAnimationStore = create<LandingAnimationState>(
	(set, get) => ({
		currentView: "inbox",
		isPlaying: true,

		play: () => {
			set({ isPlaying: true });
		},

		pause: () => {
			set({ isPlaying: false });
		},

		selectView: (view: LandingAnimationView) => {
			set({ currentView: view, isPlaying: true });
		},

		onAnimationComplete: () => {
			const { currentView, isPlaying } = get();

			// Only auto-switch if playing (don't switch if paused)
			if (!isPlaying) {
				return;
			}

			// Loop: inbox -> conversation -> inbox -> ...
			if (currentView === "inbox") {
				set({ currentView: "conversation", isPlaying: true });
			} else if (currentView === "conversation") {
				set({ currentView: "inbox", isPlaying: true });
			}
		},

		reset: () => {
			set({ currentView: "inbox", isPlaying: true });
		},
	})
);
