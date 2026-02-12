import type * as React from "react";

export type FaceProps = {
	className?: string;
	style?: React.CSSProperties;
	/**
	 * Enable blinking animation
	 */
	enableBlink?: boolean;
	/**
	 * Blink animation timings for left and right eyes
	 */
	blinkTimings?: {
		left: { delay: number; duration: number };
		right: { delay: number; duration: number };
	};
};

// CSS keyframes for blink animation (injected once)
const BLINK_KEYFRAMES = `
@keyframes facehash-blink {
	0%, 92%, 100% { transform: scaleY(1); }
	96% { transform: scaleY(0.05); }
}
`;

// Track if we've injected the keyframes
let keyframesInjected = false;

function injectBlinkKeyframes() {
	if (keyframesInjected || typeof document === "undefined") {
		return;
	}
	const style = document.createElement("style");
	style.textContent = BLINK_KEYFRAMES;
	document.head.appendChild(style);
	keyframesInjected = true;
}

function getBlinkStyle(
	timing: { delay: number; duration: number } | undefined
): React.CSSProperties {
	if (!timing) {
		return {};
	}
	return {
		animation: `facehash-blink ${timing.duration}s ease-in-out ${timing.delay}s infinite`,
		transformOrigin: "center center",
	};
}

/**
 * Round eyes face - simple circular eyes
 */
export const RoundFace: React.FC<FaceProps> = ({
	className,
	style,
	enableBlink,
	blinkTimings,
}) => {
	if (enableBlink) {
		injectBlinkKeyframes();
	}

	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			style={style}
			viewBox="0 0 63 15"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Right eye */}
			<g style={enableBlink ? getBlinkStyle(blinkTimings?.right) : undefined}>
				<circle cx="55.2" cy="7.2" fill="currentColor" r="7.2" />
			</g>
			{/* Left eye */}
			<g style={enableBlink ? getBlinkStyle(blinkTimings?.left) : undefined}>
				<circle cx="7.2" cy="7.2" fill="currentColor" r="7.2" />
			</g>
		</svg>
	);
};

/**
 * Cross eyes face - X-shaped eyes
 */
export const CrossFace: React.FC<FaceProps> = ({
	className,
	style,
	enableBlink,
	blinkTimings,
}) => {
	if (enableBlink) {
		injectBlinkKeyframes();
	}

	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			style={style}
			viewBox="0 0 71 23"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Left eye */}
			<g style={enableBlink ? getBlinkStyle(blinkTimings?.left) : undefined}>
				<rect fill="currentColor" height="23" rx="3.5" width="7" x="8" y="0" />
				<rect fill="currentColor" height="7" rx="3.5" width="23" x="0" y="8" />
			</g>
			{/* Right eye */}
			<g style={enableBlink ? getBlinkStyle(blinkTimings?.right) : undefined}>
				<rect
					fill="currentColor"
					height="23"
					rx="3.5"
					width="7"
					x="55.2"
					y="0"
				/>
				<rect
					fill="currentColor"
					height="7"
					rx="3.5"
					width="23"
					x="47.3"
					y="8"
				/>
			</g>
		</svg>
	);
};

/**
 * Line eyes face - horizontal line eyes
 */
export const LineFace: React.FC<FaceProps> = ({
	className,
	style,
	enableBlink,
	blinkTimings,
}) => {
	if (enableBlink) {
		injectBlinkKeyframes();
	}

	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			style={style}
			viewBox="0 0 82 8"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Left eye (2 segments) */}
			<g style={enableBlink ? getBlinkStyle(blinkTimings?.left) : undefined}>
				<rect
					fill="currentColor"
					height="6.9"
					rx="3.5"
					width="6.9"
					x="0.07"
					y="0.16"
				/>
				<rect
					fill="currentColor"
					height="6.9"
					rx="3.5"
					width="20.7"
					x="7.9"
					y="0.16"
				/>
			</g>
			{/* Right eye (2 segments) */}
			<g style={enableBlink ? getBlinkStyle(blinkTimings?.right) : undefined}>
				<rect
					fill="currentColor"
					height="6.9"
					rx="3.5"
					width="6.9"
					x="74.7"
					y="0.16"
				/>
				<rect
					fill="currentColor"
					height="6.9"
					rx="3.5"
					width="20.7"
					x="53.1"
					y="0.16"
				/>
			</g>
		</svg>
	);
};

/**
 * Curved eyes face - sleepy/happy curved eyes
 */
export const CurvedFace: React.FC<FaceProps> = ({
	className,
	style,
	enableBlink,
	blinkTimings,
}) => {
	if (enableBlink) {
		injectBlinkKeyframes();
	}

	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			style={style}
			viewBox="0 0 63 9"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Left eye */}
			<g style={enableBlink ? getBlinkStyle(blinkTimings?.left) : undefined}>
				<path
					d="M0 5.1c0-.1 0-.2 0-.3.1-.5.3-1 .7-1.3.1 0 .1-.1.2-.1C2.4 2.2 6 0 10.5 0S18.6 2.2 20.2 3.3c.1 0 .1.1.1.1.4.3.7.9.7 1.3v.3c0 1 0 1.4 0 1.7-.2 1.3-1.2 1.9-2.5 1.6-.2 0-.7-.3-1.8-.8C15 6.7 12.8 6 10.5 6s-4.5.7-6.3 1.5c-1 .5-1.5.7-1.8.8-1.3.3-2.3-.3-2.5-1.6v-1.7z"
					fill="currentColor"
				/>
			</g>
			{/* Right eye */}
			<g style={enableBlink ? getBlinkStyle(blinkTimings?.right) : undefined}>
				<path
					d="M42 5.1c0-.1 0-.2 0-.3.1-.5.3-1 .7-1.3.1 0 .1-.1.2-.1C44.4 2.2 48 0 52.5 0S60.6 2.2 62.2 3.3c.1 0 .1.1.1.1.4.3.7.9.7 1.3v.3c0 1 0 1.4 0 1.7-.2 1.3-1.2 1.9-2.5 1.6-.2 0-.7-.3-1.8-.8C57 6.7 54.8 6 52.5 6s-4.5.7-6.3 1.5c-1 .5-1.5.7-1.8.8-1.3.3-2.3-.3-2.5-1.6v-1.7z"
					fill="currentColor"
				/>
			</g>
		</svg>
	);
};

/**
 * All available face components
 */
export const FACES = [RoundFace, CrossFace, LineFace, CurvedFace] as const;

export type FaceComponent = (typeof FACES)[number];
