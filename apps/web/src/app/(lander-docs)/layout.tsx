import { Support } from "@cossistant/next";
import { DashboardButton } from "@/app/(lander-docs)/components/topbar/dashboard-button";
import { CustomBubble } from "@/components/support/custom-bubble";
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
			<Support
				classNames={{
					bubble: "bg-cossistant-orange hover:bg-cossistant-orange/80",
				}}
				slots={{
					bubble: CustomBubble,
				}}
			/>
		</div>
	);
}
