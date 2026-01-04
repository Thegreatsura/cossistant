"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Icon from "../../icons";

type BlurredSidebarItemProps = {
	children: React.ReactNode;
	iconName?: string;
	badge?: string;
};

function BlurredSidebarItem({
	children,
	iconName,
	badge,
}: BlurredSidebarItemProps) {
	return (
		<div className="group/btn relative flex h-10 items-center gap-2.5 rounded-md px-3 py-1 text-primary/80 text-sm">
			{iconName && (
				<span className="relative flex size-6 shrink-0 items-center justify-center opacity-40">
					<Icon className="size-4" name={iconName as never} />
				</span>
			)}
			<span className="flex-1 truncate">{children}</span>
			{badge && (
				<Badge className="ml-auto" variant="secondary">
					{badge}
				</Badge>
			)}
		</div>
	);
}

type BlurredAgentsSidebarProps = {
	className?: string;
};

export function BlurredAgentsSidebar({ className }: BlurredAgentsSidebarProps) {
	return (
		<div
			className={cn(
				"pointer-events-none relative flex h-full w-[240px] shrink-0 select-none flex-col border-primary/5 border-r bg-background-100/30 dark:bg-background-200/30",
				className
			)}
		>
			{/* Blur overlay */}
			<div className="absolute inset-0 z-10 backdrop-blur-[2px]" />

			{/* Content */}
			<div className="relative flex w-full flex-col gap-1 px-2 py-2 opacity-50">
				<BlurredSidebarItem iconName="arrow-left">
					Back to Inbox
				</BlurredSidebarItem>

				<div className="mt-5 flex flex-col gap-1">
					<BlurredSidebarItem iconName="settings-2">General</BlurredSidebarItem>
				</div>

				{/* Training Section */}
				<div className="mt-6">
					<span className="mb-2 block px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
						Training
					</span>
					<div className="flex flex-col gap-1">
						<BlurredSidebarItem iconName="dashboard">
							Web Sources
						</BlurredSidebarItem>
						<BlurredSidebarItem iconName="help">FAQ</BlurredSidebarItem>
						<BlurredSidebarItem badge="Soon" iconName="file">
							Files
						</BlurredSidebarItem>
					</div>
				</div>

				{/* Capabilities Section */}
				<div className="mt-6">
					<span className="mb-2 block px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
						Capabilities
					</span>
					<div className="flex flex-col gap-1">
						<BlurredSidebarItem badge="Soon" iconName="cli">
							Tools
						</BlurredSidebarItem>
						<BlurredSidebarItem badge="Soon" iconName="card">
							Integrations
						</BlurredSidebarItem>
					</div>
				</div>

				{/* Footer */}
				<div className="mt-auto pt-4">
					<BlurredSidebarItem>Docs</BlurredSidebarItem>
					<BlurredSidebarItem>Settings</BlurredSidebarItem>
				</div>
			</div>
		</div>
	);
}
