import { Support } from "@cossistant/next";
import { Suspense } from "react";
import {
	DashboardButton,
	DashboardButtonSkeleton,
} from "@/app/(lander-docs)/components/topbar/dashboard-button";
import { Footer } from "./components/footer";
import { TopBar } from "./components/topbar";

// Force dynamic rendering to ensure DashboardButton can access user session data
// via cookies/headers even when child pages are statically generated
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative flex min-h-svh flex-col overflow-clip border-grid-x">
			<TopBar>
				<Suspense fallback={<DashboardButtonSkeleton />}>
					<DashboardButton />
				</Suspense>
			</TopBar>
			<main className="flex flex-1 flex-col">
				<div className="container-wrapper mx-auto">{children}</div>
			</main>
			<Footer />
			<Support />
		</div>
	);
}
