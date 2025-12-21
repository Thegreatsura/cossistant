"use client";

import { Support } from "@cossistant/next/support";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardTriggerContent } from "@/components/support/custom-trigger";
import { useVisitorPresence } from "@/contexts/visitor-presence";
import { useWebsite } from "@/contexts/website";
import { Logo } from "../../logo";
import { TopbarItem } from "./topbar-item";

export function NavigationTopbar() {
	const pathname = usePathname();
	const website = useWebsite();

	const { onlineCount, isLoading } = useVisitorPresence();

	const baseInboxPath = `/${website?.slug}/inbox`;

	return (
		<header className="flex h-16 min-h-16 w-full items-center justify-between gap-4 pr-2 pl-6.5">
			<div className="flex flex-1 items-center gap-3">
				<Link className="mr-2" href={baseInboxPath}>
					<Logo className="size-5.5 text-primary" />
				</Link>
				<TopbarItem
					active={pathname.startsWith(`/${website?.slug}/contacts`)}
					hideLabelOnMobile
					href={`/${website?.slug}/contacts`}
				>
					Contacts
				</TopbarItem>
				{process.env.NODE_ENV === "development" && (
					<TopbarItem
						active={pathname === `/${website?.slug}/agents`}
						hideLabelOnMobile
						href={`/${website?.slug}/agents`}
					>
						Agent
					</TopbarItem>
				)}
			</div>
			<div className="flex items-center gap-3">
				<div className="hidden items-center gap-3 font-medium text-primary/80 text-xs md:flex">
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
				<Support align="end" side="bottom" sideOffset={8}>
					<Support.Trigger className="group/btn relative z-0 hidden h-9 cursor-pointer items-center gap-3 rounded-sm border border-primary/10 bg-background-200 px-2.5 text-primary hover:bg-background-300 sm:flex">
						{(props) => <DashboardTriggerContent {...props} />}
					</Support.Trigger>
				</Support>
			</div>
		</header>
	);
}
