"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useNewMessageSound } from "../../hooks/use-new-message-sound";
import { useTypingSound } from "../../hooks/use-typing-sound";
import * as Primitive from "../../primitives";
import type { TriggerRenderProps } from "../types";
import { cn } from "../utils";
import Icon from "./icons";
import { BouncingDots } from "./typing-indicator";

type TriggerContentProps = {
	isOpen: boolean;
	unreadCount: number;
	isTyping: boolean;
};

const TriggerContent: React.FC<TriggerContentProps> = ({
	isOpen,
	unreadCount,
	isTyping,
}) => {
	const playNewMessageSound = useNewMessageSound({
		volume: 0.7,
		playbackRate: 1.0,
	});
	const previousUnreadCountRef = React.useRef(0);

	useTypingSound(!isOpen && isTyping, {
		volume: 1,
		playbackRate: 1.3,
	});

	React.useEffect(() => {
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
						<Icon className="size-5" name="chevron-down" />
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
						<Icon className="size-6.5" name="chat" variant="filled" />
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

export type DefaultTriggerProps = {
	className?: string;
};

/**
 * Default styled trigger button.
 * Used internally when no custom trigger is provided.
 */
export const DefaultTrigger: React.FC<DefaultTriggerProps> = ({
	className,
}) => (
	<Primitive.Trigger asChild>
		{({ isOpen, unreadCount, isTyping }: TriggerRenderProps) => (
			<motion.button
				className={cn(
					"relative z-[9999] flex size-14 cursor-pointer items-center justify-center rounded-full bg-co-primary text-co-primary-foreground transition-colors hover:bg-co-primary/90 data-[open=true]:bg-co-primary/90",
					className
				)}
				data-open={isOpen}
				transition={{
					type: "spring",
					stiffness: 800,
					damping: 17,
				}}
				type="button"
				whileTap={{ scale: 0.95 }}
			>
				<TriggerContent
					isOpen={isOpen}
					isTyping={isTyping}
					unreadCount={unreadCount}
				/>
			</motion.button>
		)}
	</Primitive.Trigger>
);
