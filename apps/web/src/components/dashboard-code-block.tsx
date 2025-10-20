"use client";

import { useShikiHighlighter } from "react-shiki/web";
import { SHARED_SHIKI_TRANSFORMERS } from "@/lib/highlight-code";
import { cn } from "@/lib/utils";
import { ComponentCodeReact } from "./component-code";

export function DashboardCodeBlock({
  fileName,
  code,
  language = "tsx",
  className,
}: React.ComponentProps<"div"> & {
  code: string;
  language: string;
  fileName: string;
}) {
  const highlighted = useShikiHighlighter(
    code,
    language,
    {
      light: "github-light",
      dark: "github-dark",
    },
    {
      defaultColor: false,
      cssVariablePrefix: "--shiki-",
      transformers: SHARED_SHIKI_TRANSFORMERS,
    }
  );

  return (
    <div
      className={cn(
        "scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-background-100 relative overflow-clip rounded-md border border-primary/10 bg-background-200",
        className
      )}
    >
      <span className="absolute top-2 left-6 text-muted-foreground text-sm">
        {fileName}
      </span>
      <ComponentCodeReact code={code}>{highlighted}</ComponentCodeReact>
    </div>
  );
}
