import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";

export function VisitorSidebarPlaceholder() {
  return (
    <ResizableSidebar className="hidden lg:flex" position="right">
      <SidebarContainer>
        <div>VisitorSidebarPlaceholder</div>
      </SidebarContainer>
    </ResizableSidebar>
  );
}
