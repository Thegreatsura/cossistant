import type { RouterOutputs } from "@api/trpc/types";
import { Avatar } from "@/components/ui/avatar";
import { generateVisitorName } from "@/lib/visitors";
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

  const fullName =
    visitor.name || visitor.email || generateVisitorName(visitor.id);

  return (
    <ResizableSidebar position="right" className="hidden lg:flex">
      <SidebarContainer>
        <div className="h-10 w-full flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Avatar url={visitor.avatar} fallbackName={fullName} />
            <div className="flex flex-col">
              <p className="text-sm font-medium">{fullName}</p>
              <p className="text-xs text-muted-foreground">{visitor.email}</p>
            </div>
          </div>
        </div>
      </SidebarContainer>
    </ResizableSidebar>
  );
}
