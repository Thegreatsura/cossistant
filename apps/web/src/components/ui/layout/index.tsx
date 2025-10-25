import Link from "next/link";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../button";
import Icon from "../icons";

export const PageHeaderTitle = ({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) => (
	<h3 className={cn("font-medium text-primary text-sm", className)}>
		{children}
	</h3>
);

export const PageHeader = ({
	children,
	className,
	defaultBackPath,
}: {
	children: React.ReactNode;
	className?: string;
	defaultBackPath?: string;
}) => (
	<div
		className={cn(
			"absolute inset-x-0 top-0 z-10 flex h-14 w-full items-center justify-between gap-4 bg-background px-5 dark:bg-background-50",
			className
		)}
	>
		{defaultBackPath && (
			<Link className="-ml-1.5" href={defaultBackPath}>
				<Button className="px-1 text-sm" size="sm" variant="ghost">
					<Icon name="arrow-left" />
					Back
				</Button>
			</Link>
		)}
		{children}
	</div>
);

export const Page = ({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) => (
	<div
		className={cn(
			"relative flex h-full flex-1 flex-col overflow-hidden",
			className
		)}
	>
		{children}
	</div>
);

export const PageContent = ({
	children,
	className,
	ref,
}: {
	children: React.ReactNode;
	className?: string;
	ref?: RefObject<HTMLDivElement | null>;
}) => (
	<div
		className={cn(
			"scrollbar-thin scrollbar-thumb-background-500 scrollbar-track-background-100 relative flex h-full flex-1 flex-col overflow-y-auto p-4 pt-14",
			className
		)}
		ref={ref}
	>
		{children}
	</div>
);

export const CentralContainer = ({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) => (
	<div className="h-[calc(100vh-4rem)] w-full px-2 pb-2">
		<section
			className={cn(
				"flex h-full max-h-full overflow-clip rounded border border-primary/10 bg-background dark:border-primary/5 dark:bg-background-50",
				className
			)}
		>
			{children}
		</section>
	</div>
);
