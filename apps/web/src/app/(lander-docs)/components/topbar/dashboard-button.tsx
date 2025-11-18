"use client";

import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TopbarButton } from "@/components/ui/topbar-button";
import { authClient } from "@/lib/auth/client";
import { CtaButton } from "./cta-button";

export function DashboardButtonSkeleton() {
	return (
		<Button className="h-auto w-[126px] rounded-[2px] p-1 pr-3">
			<Skeleton className="size-7 min-w-7 rounded-[1px] bg-background-700" />
			<Skeleton className="w-full opacity-20" />
		</Button>
	);
}

export function DashboardButton() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <DashboardButtonSkeleton />;
	}

	if (!session?.user) {
		return (
			<>
				<TopbarButton
					href="/login"
					shortcuts={["l"]}
					tooltip="Login"
					withBrackets={false}
				>
					Login
				</TopbarButton>
				<CtaButton />
			</>
		);
	}

	return (
		<Link href="/select">
			<Button
				className="h-auto w-[126px] rounded-[2px] p-1 pr-3"
				variant="ghost"
			>
				<Avatar
					className="size-7 rounded-[1px] bg-background-700 ring-0 ring-offset-0"
					fallbackName={session.user.name}
					url={session.user.image}
				/>
				Dashboard
			</Button>
		</Link>
	);
}
