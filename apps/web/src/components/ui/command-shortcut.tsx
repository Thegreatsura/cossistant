import { cn } from "@/lib/utils";

export const CommandShortcut = ({
	className,
	children,
	...props
}: React.HTMLAttributes<Omit<HTMLSpanElement, "children">> & {
	children: string[];
}) => {
	const isMac =
		typeof window !== "undefined" &&
		window.navigator.platform.toUpperCase().indexOf("MAC") >= 0;

	const renderShortcut = (_children: string[]) => {
		return (
			<>
				{_children.map((child, index) => {
					return (
						<span key={child}>
							<span>{child === "mod" ? (isMac ? "⌘" : "Ctrl") : child}</span>
							{index < _children.length - 1 && (
								<span className="mx-0.5 text-primary-foreground/80">+</span>
							)}
						</span>
					);
				})}
			</>
		);
	};

	return (
		<span
			className={cn(
				"ml-auto inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-xs bg-primary-foreground/15 px-1 text-center font-medium font-mono text-[9px] text-primary-foreground uppercase",
				className
			)}
			{...props}
		>
			{renderShortcut(children)}
		</span>
	);
};

CommandShortcut.displayName = "CommandShortcut";
