import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ConversationBasicActions({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <TooltipOnHover content="Mark as resolved" shortcuts={["R"]}>
        <Button>
          <Icon name="check" />
        </Button>
      </TooltipOnHover>
      <TooltipOnHover content="Mark as archived" shortcuts={["Delete"]}>
        <Button>
          <Icon name="archive" />
        </Button>
      </TooltipOnHover>
    </div>
  );
}
