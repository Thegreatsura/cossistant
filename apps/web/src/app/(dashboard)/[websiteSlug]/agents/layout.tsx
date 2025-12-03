import { AgentsNavigationSidebar } from "@/components/ui/layout/sidebars/agents-navigation";

type AgentsLayoutProps = {
	children: React.ReactNode;
};

export default function Layout({ children }: AgentsLayoutProps) {
	return (
		<>
			<AgentsNavigationSidebar />
			{children}
		</>
	);
}
