import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";

export function VisitorSidebarPlaceholder() {
	return (
		<ResizableSidebar position="right" className="hidden lg:flex">
			<SidebarContainer>
				<div>VisitorSidebarPlaceholder</div>
			</SidebarContainer>
		</ResizableSidebar>
	);
}
