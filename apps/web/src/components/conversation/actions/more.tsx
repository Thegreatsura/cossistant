import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Icon from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function MoreConversationActions({
  className,
  conversationId,
}: {
  className?: string;
  conversationId: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 pr-1", className)}>
      <DropdownMenu>
        <TooltipOnHover content="More options">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-small">
              <Icon name="more" filledOnHover />
            </Button>
          </DropdownMenuTrigger>
        </TooltipOnHover>
        <DropdownMenuContent
          align="end"
          className="min-w-56"
          side="top"
          sideOffset={4}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => {}} shortcuts={["R"]}>
              Mark resolved
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => {}} shortcuts={["Delete"]}>
              Mark archived
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => {}} shortcuts={["U"]}>
              Mark as read
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => {}} shortcuts={["P"]}>
              Mark spam
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => {}}>
              Block visitor
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => {}}>
            Copy conversation ID
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => {}}>
            Copy conversation URL
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
