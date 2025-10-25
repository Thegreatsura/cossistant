import type React from "react";
import { Page, PageContent, PageHeader } from "@/components/ui/layout";
import { cn } from "@/lib/utils";

type SettingsRowProps = {
	children: React.ReactNode;
	title: string;
	description: string;
};

type SettingsPageProps = {
	children: React.ReactNode;
	className?: string;
};

export function SettingsPage({ children, className }: SettingsPageProps) {
	return <Page className={cn(className)}>{children}</Page>;
}

export function SettingsHeader({ children }: { children: React.ReactNode }) {
	return (
		<PageHeader className="absolute z-10 border-primary/10 border-b bg-background pl-3.5 text-sm 2xl:border-transparent 2xl:bg-transparent dark:border-primary/5 dark:bg-background-50 dark:2xl:border-transparent 2xl:dark:bg-transparent">
			{children}
		</PageHeader>
	);
}

export function SettingsRow({
	children,
	title,
	description,
}: SettingsRowProps) {
	return (
		<section className="mx-auto mb-8 flex w-full max-w-3xl flex-col gap-2 pb-8 last:mb-0last:pb-0">
			<h1 className="font-medium text-base text-primary">{title}</h1>
			<p className="text-primary/60 text-sm">{description}</p>
			<div className="mt-4 flex w-full flex-col overflow-clip rounded-md border border-primary/10 dark:border-primary/5 dark:bg-background-100">
				{children}
			</div>
		</section>
	);
}

export function SettingsRowFooter({ children, className }: SettingsPageProps) {
	return (
		<div
			className={cn(
				"border-primary/10 border-t bg-background-100 p-4 dark:border-primary/5",
				className
			)}
		>
			{children}
		</div>
	);
}
