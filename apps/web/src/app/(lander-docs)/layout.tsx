import { Support } from "@cossistant/next";
import { DashboardButton } from "@/app/(lander-docs)/components/topbar/dashboard-button";
import { LandingTriggerContent } from "@/components/support/custom-trigger";
import { Footer } from "./components/footer";
import { TopBar } from "./components/topbar";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative flex min-h-svh flex-col overflow-clip border-grid-x">
			<TopBar>
				<DashboardButton />
			</TopBar>
			<main className="flex flex-1 flex-col">
				<div className="container-wrapper mx-auto">{children}</div>
			</main>
			<Footer />
			<Support>
				<Support.Trigger className="relative flex size-14 cursor-pointer items-center justify-center rounded-full bg-cossistant-orange text-primary-foreground transition-colors">
					{(props) => <LandingTriggerContent {...props} />}
				</Support.Trigger>
			</Support>
		</div>
	);
}
