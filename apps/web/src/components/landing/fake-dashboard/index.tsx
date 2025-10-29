"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FakeInbox } from "./fake-inbox";
import { useFakeInbox } from "./fake-inbox/use-fake-inbox";
import { FakeCentralContainer } from "./fake-layout";
import { FakeNavigationTopbar } from "./fake-navigation-topbar";

export function FakeDashboard({ className }: { className?: string }) {
	const [activeView, setActiveView] = useState<"inbox" | "conversation">(
		"inbox"
	);
	const { conversations, resetDemoData } = useFakeInbox();

	return (
		<div
			className={cn(
				"@container size-full overflow-hidden bg-background-100 dark:bg-background",
				className
			)}
		>
			<FakeNavigationTopbar />
			<FakeCentralContainer>
				{activeView === "inbox" ? (
					<FakeInbox conversations={conversations} />
				) : null}
			</FakeCentralContainer>
		</div>
	);
}
