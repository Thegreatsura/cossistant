import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";

export function VisitorSidebar() {
  return (
    <ResizableSidebar position="right" className="hidden lg:flex">
      <SidebarContainer>VisitorSidebar</SidebarContainer>
    </ResizableSidebar>
  );
}
