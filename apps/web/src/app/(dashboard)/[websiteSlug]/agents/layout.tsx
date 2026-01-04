"use client";

import { usePathname } from "next/navigation";
import { AgentsNavigationSidebar } from "@/components/ui/layout/sidebars/agents-navigation";

type AgentsLayoutProps = {
	children: React.ReactNode;
};

export default function Layout({ children }: AgentsLayoutProps) {
	const pathname = usePathname();

	// Don't show sidebar on create page - it has its own layout with blurred sidebars
	const isCreatePage = pathname.endsWith("/agents/create");

	if (isCreatePage) {
		return <>{children}</>;
	}

	return (
		<>
			<AgentsNavigationSidebar />
			{children}
		</>
	);
}
