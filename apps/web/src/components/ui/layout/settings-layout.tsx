import type React from "react";
import { Page, PageHeader } from "@/components/ui/layout";
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
  return (
    <Page className={cn("flex flex-col gap-4", className)}>{children}</Page>
  );
}

export function SettingsHeader({ children }: { children: React.ReactNode }) {
  return (
    <PageHeader className="z-10 border-primary/10 border-b bg-background pl-3.5 2xl:border-transparent 2xl:bg-transparent dark:bg-background-100 2xl:dark:bg-transparent">
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
    <section className="mb-14 flex gap-4 border-primary/5 border-b pb-14 last:mb-0 last:border-transparent last:pb-0">
      <div className="flex flex-1 flex-col gap-2">
        <h1 className="font-medium text-base text-primary">{title}</h1>
        <p className="text-primary/60 text-sm">{description}</p>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}
