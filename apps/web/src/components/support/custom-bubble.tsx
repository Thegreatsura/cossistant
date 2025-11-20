"use client";

import { type BubbleSlotProps, Support } from "@cossistant/react";
import * as Primitive from "@cossistant/react/primitives";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { BouncingDots } from "../conversation/messages/typing-indicator";
import Icon from "../ui/icons";
import { LogoEyesTracking } from "../ui/logo-eyes-tracking";

export const CustomBubble = ({ className }: BubbleSlotProps) => (
	<Primitive.Bubble
		className={cn(
			className,
			"relative flex size-14 cursor-pointer items-center justify-center rounded-full bg-cossistant-orange text-co-primary-foreground transition-colors hover:bg-cossistant-orange data-[open=true]:bg-co-primary/90"
		)}
	>
		{({ isOpen, isTyping, unreadCount }) => (
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
							<LogoEyesTracking className="size-7.5" />
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
		)}
	</Primitive.Bubble>
);
