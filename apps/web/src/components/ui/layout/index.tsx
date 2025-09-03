import { cn } from "@/lib/utils";

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
        "scrollbar-thin scrollbar-thumb-background-500 scrollbar-track-background-500 flex flex-1 flex-col overflow-y-auto p-6",
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
