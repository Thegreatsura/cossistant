import { useEffect } from "react";
import { useSoundEffect } from "./use-sound-effect";

// Use a data URL or base64 encoded sound, or a CDN URL
// For now, we'll use a path that can be served from public directory
const TYPING_SOUND_PATH = "/sounds/typing-loop.wav";

/**
 * Hook to play a looping typing sound while someone is typing.
 *
 * @param isTyping - Whether someone is currently typing
 * @param options - Optional configuration for volume and playback speed
 *
 * @example
 * const { isTyping } = useTypingIndicator();
 * useTypingSound(isTyping, { volume: 1.0, playbackRate: 1.2 });
 */
export function useTypingSound(
	isTyping: boolean,
	options?: { volume?: number; playbackRate?: number }
): void {
	const { play, stop, isPlaying } = useSoundEffect(TYPING_SOUND_PATH, {
		loop: true,
		volume: options?.volume ?? 1.2,
		playbackRate: options?.playbackRate ?? 1.0,
	});

	useEffect(() => {
		if (isTyping && !isPlaying) {
			play();
		} else if (!isTyping && isPlaying) {
			stop();
		}
	}, [isTyping, isPlaying, play, stop]);

	// Cleanup on unmount
	useEffect(
		() => () => {
			stop();
		},
		[stop]
	);
}
