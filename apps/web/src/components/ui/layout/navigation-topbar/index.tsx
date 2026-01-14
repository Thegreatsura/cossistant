"use client";

import { Support } from "@cossistant/next/support";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { DashboardTriggerContent } from "@/components/support/custom-trigger";
import { useVisitorPresence } from "@/contexts/visitor-presence";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";
import Icon from "../../icons";
import { Logo } from "../../logo";
import { TooltipOnHover } from "../../tooltip";
import { TopbarItem } from "./topbar-item";

export function NavigationTopbar() {
	const pathname = usePathname();
	const router = useRouter();
	const website = useWebsite();
	const trpc = useTRPC();

	const { onlineCount, isLoading } = useVisitorPresence();

	// Data is pre-fetched in the layout, so it will be available immediately
	const { data: aiAgent } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website?.slug ?? "",
		})
	);

	// Check if agent exists and onboarding is complete
	const hasAgent = !!aiAgent?.onboardingCompletedAt;

	const baseInboxPath = `/${website?.slug}/inbox`;
	const isOnInboxView = pathname.startsWith(baseInboxPath);

	useHotkeys("escape", () => router.push(baseInboxPath), {
		enabled: !isOnInboxView,
		preventDefault: true,
		enableOnContentEditable: false,
		enableOnFormTags: false,
	});

	return (
		<header className="flex h-16 min-h-16 w-full items-center justify-between gap-4 pr-2 pl-6.5">
			<div className="flex flex-1 items-center gap-3">
				<AnimatePresence mode="wait">
					{isOnInboxView ? (
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							initial={{ opacity: 0, scale: 0.8 }}
							key="logo"
							transition={{ duration: 0.1 }}
						>
							<Link className="mr-2 block" href={baseInboxPath}>
								<Logo className="size-5.5 text-primary" />
							</Link>
						</motion.div>
					) : (
						<TooltipOnHover
							content="Back to Inbox"
							shortcuts={["Esc"]}
							side="right"
						>
							<motion.div
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								initial={{ opacity: 0, scale: 0.8 }}
								key="arrow"
								transition={{ duration: 0.1 }}
							>
								<Link
									className="mr-2 flex size-5.5 items-center justify-center rounded-md hover:bg-background-200"
									href={baseInboxPath}
								>
									<Icon className="size-4 text-primary" name="arrow-left" />
								</Link>
							</motion.div>
						</TooltipOnHover>
					)}
				</AnimatePresence>
				<TopbarItem
					active={pathname.startsWith(`/${website?.slug}/contacts`)}
					hideLabelOnMobile
					href={`/${website?.slug}/contacts`}
				>
					Contacts
				</TopbarItem>
				<TopbarItem
					active={pathname.startsWith(`/${website?.slug}/agent`)}
					className="pr-1"
					hideLabelOnMobile
					href={
						hasAgent
							? `/${website?.slug}/agent`
							: `/${website?.slug}/agent/create`
					}
				>
					{hasAgent ? (
						<span className="flex items-center gap-1.5">
							Agent
							<span className="rounded-sm bg-cossistant-orange px-1.5 py-0.5 font-medium text-[10px] text-white leading-none">
								AI
							</span>
						</span>
					) : (
						<span className="flex items-center gap-1.5">
							New agent
							<span className="rounded-sm bg-cossistant-orange px-1.5 py-0.5 font-medium text-[10px] text-white leading-none">
								AI
							</span>
						</span>
					)}
				</TopbarItem>
			</div>
			<div className="flex items-center gap-3">
				<div className="hidden items-center gap-3 font-medium text-primary/80 text-sm md:flex">
					<span className="flex items-center gap-2">
						<span
							aria-hidden
							className="size-2 animate-pulse rounded-full bg-cossistant-green"
						/>
						<p>
							{isLoading ? "—" : onlineCount} visitor
							{onlineCount !== 1 ? "s" : ""} online
						</p>
					</span>
				</div>
				<Support side="bottom" sideOffset={8}>
					<Support.Trigger className="group/btn relative z-0 hidden h-9 cursor-pointer items-center gap-3 rounded-sm border border-primary/10 bg-background-200 px-2.5 text-primary hover:bg-background-300 sm:flex">
						{(props) => <DashboardTriggerContent {...props} />}
					</Support.Trigger>
				</Support>
			</div>
		</header>
	);
}
