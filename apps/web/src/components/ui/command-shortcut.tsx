import { cn } from "@/lib/utils";

const DeleteIcon = ({ className }: { className?: string }) => {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.5"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
			<path d="m12 9 6 6" />
			<path d="m18 9-6 6" />
		</svg>
	);
};

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

	const renderChild = (child: string) => {
		if (child === "Delete" || child === "delete") {
			return <DeleteIcon className="size-3" />;
		}

		if (child === "mod") {
			return isMac ? "⌘" : "Ctrl";
		}

		return child;
	};

	const renderShortcut = (_children: string[]) => {
		return (
			<>
				{_children.map((child, index) => {
					return (
						<span key={child}>
							<span>{renderChild(child)}</span>
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
