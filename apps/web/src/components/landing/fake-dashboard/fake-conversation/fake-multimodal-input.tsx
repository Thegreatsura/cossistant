import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type FakeMultimodalInputProps = {
	className?: string;
	placeholder?: string;
};

export function FakeMultimodalInput({
	className,
	placeholder = "Type your message...",
}: FakeMultimodalInputProps) {
	return (
		<div className="absolute right-0 bottom-4 left-0 z-10 mx-auto w-full px-4 xl:max-w-xl xl:px-0 2xl:max-w-2xl">
			<form
				className="flex flex-col gap-2"
				onSubmit={(e) => e.preventDefault()}
			>
				{/* Input area */}
				<div className="flex flex-col rounded border border-border/50 bg-background-100 drop-shadow-xs dark:border-border/50 dark:bg-background-300">
					<div
						className={cn(
							"min-h-[44px] flex-1 resize-none overflow-hidden p-3 text-foreground text-sm placeholder:text-primary/50 focus-visible:outline-none",
							className
						)}
					>
						<div className="text-primary/50">{placeholder}</div>
					</div>

					<div className="flex items-center justify-end py-2 pr-1 pl-3">
						<div className="flex items-center gap-0.5">
							<Button disabled size="icon" type="button" variant="ghost">
								<Icon className="h-4 w-4" name="send" />
							</Button>
						</div>
					</div>
				</div>
			</form>
		</div>
	);
}
