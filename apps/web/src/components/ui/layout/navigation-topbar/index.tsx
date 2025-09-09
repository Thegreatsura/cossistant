"use client";

import { usePathname } from "next/navigation";
import { useWebsite } from "@/contexts/dashboard/website-context";
import { Logo } from "../../logo";
import { TopbarItem } from "./topbar-item";
import UserDropdown from "./user-dropdown";

export function NavigationTopbar() {
	const pathname = usePathname();
	const website = useWebsite();

	return (
		<header className="flex h-16 min-h-16 w-full items-center justify-between gap-4 pr-3 pl-6">
			<div className="flex flex-1 items-center gap-4">
				<Logo className="size-6 text-primary" />
				<TopbarItem
					active={pathname === `/${website.slug}`}
					href={`/${website.slug}`}
					iconName="inbox-zero"
				>
					{website.name}
				</TopbarItem>
				<TopbarItem
					active={pathname === `/${website.slug}/agents`}
					hideLabelOnMobile
					href={`/${website.slug}/agents`}
					iconName="agent"
				>
					Agents
				</TopbarItem>
			</div>
			<div className="flex items-center gap-3">
				<TopbarItem
					active={pathname === `/${website.slug}/settings`}
					hideLabelOnMobile
					href={`/${website.slug}/settings`}
					iconName="settings"
				>
					Settings
				</TopbarItem>
				<UserDropdown />
			</div>
		</header>
	);
}
