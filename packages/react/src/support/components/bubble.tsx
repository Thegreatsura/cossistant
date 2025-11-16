"use client";

import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useEffect, useRef } from "react";
import { useNewMessageSound } from "../../hooks/use-new-message-sound";
import { useTypingSound } from "../../hooks/use-typing-sound";
import * as Primitive from "../../primitives";
import { cn } from "../utils";
import Icon from "./icons";
import { BouncingDots } from "./typing-indicator";

type BubbleContentProps = {
	isOpen: boolean;
	unreadCount: number;
	isTyping: boolean;
};

const BubbleContent: React.FC<BubbleContentProps> = ({
	isOpen,
	unreadCount,
	isTyping,
}) => {
	// Customize playback settings here:
	// - volume: 0.0 to 1.0+ (default varies by sound)
	// - playbackRate: 0.5 to 2.0 (1.0 is normal speed, higher = faster)
	const playNewMessageSound = useNewMessageSound({
		volume: 0.7,
		playbackRate: 1.0,
	});
	const previousUnreadCountRef = useRef(0);

	// Play typing sound when widget is closed and someone is typing
	useTypingSound(!isOpen && isTyping, {
		volume: 1,
		playbackRate: 1.3,
	});

	// Play new message sound when unread count increases
	useEffect(() => {
		if (unreadCount > previousUnreadCountRef.current) {
			playNewMessageSound();
		}
		previousUnreadCountRef.current = unreadCount;
	}, [unreadCount, playNewMessageSound]);

	return (
		<>
			<AnimatePresence mode="wait">
				{isOpen ? (
					<motion.div
						animate={{
							scale: 1,
							rotate: 0,
							opacity: 1,
							transition: { duration: 0.2, ease: "easeOut" },
						}}
						className="flex items-center justify-center"
						exit={{
							scale: 0.9,
							rotate: -45,
							opacity: 0,
							transition: { duration: 0.1, ease: "easeIn" },
						}}
						initial={{ scale: 0.9, rotate: 45, opacity: 0 }}
						key="chevron"
					>
						<Icon className="h-5 w-5" name="chevron-down" />
					</motion.div>
				) : isTyping ? (
					<motion.span
						animate={{
							opacity: 1,
							scale: 1,
							transition: {
								duration: 0.2,
								ease: "easeOut",
							},
						}}
						className="pointer-events-none flex items-center rounded-full text-co-primary"
						exit={{
							opacity: 0,
							scale: 0.9,
							transition: {
								duration: 0.1,
								ease: "easeIn",
							},
						}}
						initial={{ opacity: 0, scale: 0.9 }}
						key="typing-indicator"
					>
						<BouncingDots className="bg-co-primary-foreground" />
					</motion.span>
				) : (
					<motion.div
						animate={{
							scale: 1,
							rotate: 0,
							opacity: 1,
							transition: { duration: 0.2, ease: "easeOut" },
						}}
						className="flex items-center justify-center"
						exit={{
							scale: 0.9,
							rotate: 45,
							opacity: 0,
							transition: { duration: 0.1, ease: "easeIn" },
						}}
						initial={{ scale: 0.9, rotate: -45, opacity: 0 }}
						key="chat"
					>
						<Icon className="h-6 w-6" name="chat" variant="filled" />
					</motion.div>
				)}
			</AnimatePresence>

			{unreadCount > 0 && (
				<motion.div
					animate={{ scale: 1, opacity: 1 }}
					className="absolute top-0.5 right-0.5 flex size-2 items-center justify-center rounded-full bg-co-destructive font-medium text-[10px] text-co-destructive-foreground text-white text-xs"
					exit={{ scale: 0, opacity: 0 }}
					initial={{ scale: 0, opacity: 0 }}
				/>
			)}
		</>
	);
};

export type BubbleProps = {
	className?: string;
};

export const Bubble: React.FC<BubbleProps> = ({ className }) => (
	<Primitive.Bubble
		className={cn(
			"relative flex size-12 cursor-pointer items-center justify-center rounded-full bg-co-primary text-co-primary-foreground transition-colors hover:bg-co-primary/90 data-[open=true]:bg-co-primary/90",
			className
		)}
	>
		{({ isOpen, unreadCount, isTyping }) => (
			<BubbleContent
				isOpen={isOpen}
				isTyping={isTyping}
				unreadCount={unreadCount}
			/>
		)}
	</Primitive.Bubble>
);
