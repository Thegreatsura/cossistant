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
		<div className={cn("flex items-center gap-2 pr-1", className)}>
			<TooltipOnHover content="Mark as resolved" shortcuts={["R"]}>
				<Button size="icon-small" variant="ghost">
					<Icon filledOnHover name="check" />
				</Button>
			</TooltipOnHover>
			<TooltipOnHover content="Mark as archived" shortcuts={["Delete"]}>
				<Button size="icon-small" variant="ghost">
					<Icon filledOnHover name="archive" />
				</Button>
			</TooltipOnHover>
		</div>
	);
}
