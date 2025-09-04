import { cn } from "@/lib/utils";

export const PageHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 flex h-16 w-full items-center justify-between gap-4 border-b px-2",
        className
      )}
    >
      {children}
    </div>
  );
};

export const Page = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "scrollbar-thin scrollbar-thumb-background-500 scrollbar-track-background-500 relative flex h-full flex-1 flex-col overflow-y-auto p-6 pt-16",
        className
      )}
    >
      {children}
    </div>
  );
};

export const CentralContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className="h-full w-full px-3 pb-3">
      <section
        className={cn(
          "flex h-full max-h-full rounded-md border border-primary/10 bg-background",
          className
        )}
      >
        {children}
      </section>
    </div>
  );
};
