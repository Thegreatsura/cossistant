import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";

export function VisitorSidebar() {
	return (
		<ResizableSidebar position="right">
			<SidebarContainer>VisitorSidebar</SidebarContainer>
		</ResizableSidebar>
	);
}
