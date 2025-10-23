import { motion } from "motion/react";
import type { ReactElement } from "react";
import { useHomePage } from "../../hooks/use-home-page";
import { useSupport } from "../../provider";
import { PENDING_CONVERSATION_ID } from "../../utils/id";
import { AvatarStack } from "../components/avatar-stack";
import { Button } from "../components/button";
import { ConversationButtonLink } from "../components/conversation-button-link";
import { Header } from "../components/header";
import Icon from "../components/icons";
import { TextEffect } from "../components/text-effect";
import { Watermark } from "../components/watermark";
import { useSupportNavigation } from "../store/support-store";
import { Text, useSupportText } from "../text";

/**
 * Home page component for the support widget.
 *
 * Displays:
 * - Welcome message with available agents
 * - Quick action buttons
 * - Last open conversation (if any)
 * - Button to start new conversation
 * - Link to conversation history
 *
 * All logic is handled by the useHomePage hook.
 */
export const HomePage = (): ReactElement => {
	const { website, availableHumanAgents, visitor, quickOptions } = useSupport();
	const { navigate } = useSupportNavigation();
	const text = useSupportText();

	// Main home page hook - handles all logic
	const home = useHomePage({
		onStartConversation: (initialMessage) => {
			navigate({
				page: "CONVERSATION",
				params: {
					conversationId: PENDING_CONVERSATION_ID,
					initialMessage,
				},
			});
		},
		onOpenConversation: (conversationId) => {
			navigate({
				page: "CONVERSATION",
				params: {
					conversationId,
				},
			});
		},
		onOpenConversationHistory: () => {
			navigate({
				page: "CONVERSATION_HISTORY",
			});
		},
	});

	return (
		<>
			<Header>{/* <NavigationTab /> */}</Header>
			<div className="sticky top-4 flex flex-1 items-center justify-center">
				<div className="flex flex-col items-center gap-2">
					<motion.div
						animate="visible"
						className="flex flex-col items-center justify-center gap-2"
						exit="exit"
						initial="hidden"
						transition={{
							delay: 0.1,
						}}
						variants={{
							hidden: { opacity: 0, y: 20, filter: "blur(12px)" },
							visible: { opacity: 1, y: 0, filter: "blur(0px)" },
							exit: { opacity: 0, y: 20, filter: "blur(12px)" },
						}}
					>
						<AvatarStack
							aiAgents={website?.availableAIAgents || []}
							humanAgents={availableHumanAgents}
							size={44}
							spacing={32}
						/>
						<Text
							as="p"
							className="mb-4 text-co-primary/80 text-sm"
							textKey="page.home.tagline"
							variables={{ websiteName: website?.name ?? null }}
						/>
					</motion.div>

					<TextEffect
						as="h2"
						className="max-w-xs text-balance text-center font-co-sans text-2xl leading-normal"
						delay={0.5}
						preset="fade-in-blur"
					>
						{text("page.home.greeting", {
							visitorName: visitor?.contact?.name ?? undefined,
						})}
					</TextEffect>

					{quickOptions.length > 0 && (
						<motion.div
							animate="visible"
							className="mt-6 inline-flex gap-2"
							exit="exit"
							initial="hidden"
							transition={{
								delay: 1.3,
							}}
							variants={{
								hidden: { opacity: 0, y: 20, filter: "blur(12px)" },
								visible: { opacity: 1, y: 0, filter: "blur(0px)" },
								exit: { opacity: 0, y: 20, filter: "blur(12px)" },
							}}
						>
							{quickOptions?.map((option) => (
								<Button
									className="rounded-full border-dashed"
									key={option}
									onClick={() => home.startConversation(option)}
									size="default"
									variant="outline"
								>
									{option}
								</Button>
							))}
						</motion.div>
					)}
				</div>
			</div>
			<div className="flex flex-shrink-0 flex-col items-center justify-center gap-2 px-6 pb-4">
				{home.availableConversationsCount > 0 && (
					<Button
						className="relative w-full text-co-primary/40 text-xs hover:text-co-primary"
						onClick={home.openConversationHistory}
						variant="ghost"
					>
						<Text
							as="span"
							textKey="page.home.history.more"
							variables={{ count: home.availableConversationsCount }}
						/>
					</Button>
				)}

				{home.lastOpenConversation && (
					<div className="flex w-full flex-col overflow-clip rounded-md border border-co-border/80">
						<ConversationButtonLink
							className="rounded-none"
							conversation={home.lastOpenConversation}
							key={home.lastOpenConversation.id}
							onClick={() => {
								if (home.lastOpenConversation) {
									home.openConversation(home.lastOpenConversation.id);
								}
							}}
						/>
					</div>
				)}

				<div className="sticky bottom-4 z-10 flex w-full flex-col items-center gap-2">
					<Button
						className="relative w-full justify-between"
						onClick={() => home.startConversation()}
						size="large"
						variant="secondary"
					>
						<Icon
							className="-translate-y-1/2 absolute top-1/2 right-4 size-3 text-co-primary/60 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:text-co-primary"
							name="arrow-right"
							variant="default"
						/>
						<Text as="span" textKey="common.actions.askQuestion" />
					</Button>
					<Watermark className="mt-4 mb-2" />
				</div>
				<div />
			</div>
		</>
	);
};
