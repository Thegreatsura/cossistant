"use client";

import Link from "next/link";
import { TopbarItem } from "@/components/ui/layout/navigation-topbar/topbar-item";
import { Logo } from "@/components/ui/logo";

export function FakeNavigationTopbar({
	className,
	amountOfVisitors = 10,
}: {
	className?: string;
	amountOfVisitors?: number;
}) {
	return (
		<header className="pointer-events-none flex h-16 min-h-16 w-full items-center justify-between gap-4 pr-3 pl-6.5">
			<div className="flex flex-1 items-center gap-3">
				<Link className="mr-2" href="/">
					<Logo className="size-5.5 text-primary" />
				</Link>
				<TopbarItem active={true} hideLabelOnMobile href="/">
					Inbox
				</TopbarItem>
				<TopbarItem hideLabelOnMobile href="/contacts">
					Contacts
				</TopbarItem>
				<TopbarItem className="pr-1" hideLabelOnMobile href="/agent">
					<span className="flex items-center gap-1.5">
						Agent
						<span className="rounded-sm bg-cossistant-orange px-1.5 py-0.5 font-medium text-[10px] text-white leading-none">
							AI
						</span>
					</span>
				</TopbarItem>
			</div>
			<div className="mr-2 flex items-center gap-3">
				<div className="hidden items-center gap-3 font-medium text-primary/80 text-sm md:flex">
					<span className="flex items-center gap-2">
						<span
							aria-hidden
							className="size-2 animate-pulse rounded-full bg-cossistant-green"
						/>
						<p>
							{amountOfVisitors} visitor{amountOfVisitors !== 1 ? "s" : ""}{" "}
							online
						</p>
					</span>
				</div>
			</div>
		</header>
	);
}
