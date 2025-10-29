import { cn } from "@/lib/utils";

export const FakeCentralContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className="h-[calc(100%-4rem)] w-full px-2 pb-2">
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
