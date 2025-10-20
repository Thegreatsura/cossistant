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
    <Page className={cn("relative flex flex-col gap-4 py-20", className)}>
      {children}
    </Page>
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
    <section className="mx-auto mb-14 flex w-full max-w-3xl flex-col gap-2 border-primary/5 border-b pb-14 last:mb-0 last:border-transparent last:pb-0">
      <h1 className="font-medium text-base text-primary">{title}</h1>
      <p className="text-primary/60 text-sm">{description}</p>
      <div className="mt-4 flex w-full flex-col rounded-md border border-primary/10">
        {children}
      </div>
    </section>
  );
}

export function SettingsRowFooter({ children, className }: SettingsPageProps) {
  return (
    <div className={cn("border-primary/10 border-t p-4", className)}>
      {children}
    </div>
  );
}
