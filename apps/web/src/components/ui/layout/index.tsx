import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "../button";
import Icon from "../icons";

export const PageHeaderTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h3 className={cn("font-medium text-primary text-sm", className)}>
      {children}
    </h3>
  );
};

export const PageHeader = ({
  children,
  className,
  defaultBackPath,
}: {
  children: React.ReactNode;
  className?: string;
  defaultBackPath?: string;
}) => {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 flex h-14 w-full items-center justify-between gap-4 px-5",
        className,
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
        "scrollbar-thin scrollbar-thumb-background-500 scrollbar-track-background-500 relative flex h-full flex-1 flex-col overflow-y-auto p-4 pt-14",
        className,
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
    <div className="h-[calc(100vh-4rem)] w-full px-2 pb-2">
      <section
        className={cn(
          "flex h-full max-h-full rounded border border-primary/8 bg-background dark:bg-background-100",
          className,
        )}
      >
        {children}
      </section>
    </div>
  );
};
