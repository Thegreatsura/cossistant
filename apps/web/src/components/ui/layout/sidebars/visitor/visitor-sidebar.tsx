import type { RouterOutputs } from "@api/trpc/types";
import { Avatar } from "@/components/ui/avatar";
import { getVisitorNameWithFallback } from "@/lib/visitors";
import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";
import { VisitorSidebarPlaceholder } from "./placeholder";

type VisitorSidebarProps = {
	visitor: RouterOutputs["conversation"]["getVisitorById"];
	isLoading: boolean;
};

export function VisitorSidebar({ visitor, isLoading }: VisitorSidebarProps) {
	if (isLoading || !visitor) {
		return <VisitorSidebarPlaceholder />;
	}

	const fullName = getVisitorNameWithFallback(visitor);

	return (
		<ResizableSidebar className="hidden lg:flex" position="right">
			<SidebarContainer>
				<div className="flex h-10 w-full items-center justify-between px-2">
					<div className="flex items-center gap-2">
						<Avatar fallbackName={fullName} url={visitor.avatar} />
						<div className="flex flex-col">
							<p className="font-medium text-sm">{fullName}</p>
							<p className="text-muted-foreground text-xs">{visitor.email}</p>
						</div>
					</div>
				</div>
			</SidebarContainer>
		</ResizableSidebar>
	);
}
