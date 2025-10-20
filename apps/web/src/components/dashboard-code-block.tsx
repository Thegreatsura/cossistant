"use client";

import * as React from "react";
import { useShikiHighlighter } from "react-shiki/web";

import { SHARED_SHIKI_TRANSFORMERS } from "@/lib/highlight-code";
import { cn } from "@/lib/utils";

import { ComponentCodeReact } from "./component-code";
import { NextJsIcon, ReactIcon } from "./framework-picker";

type SupportedFramework = "react" | "nextjs";

type FrameworkCodeExample = {
  code: string;
  comment?: string;
};

type DashboardCodeBlockProps = React.ComponentProps<"div"> & {
  code:
    | string
    | Partial<Record<SupportedFramework, FrameworkCodeExample>>;
  language?: string;
  fileName: string;
};

const FRAMEWORK_META: Record<SupportedFramework, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  react: {
    label: "React",
    icon: ReactIcon,
  },
  nextjs: {
    label: "Next.js",
    icon: NextJsIcon,
  },
};

export function DashboardCodeBlock({
  fileName,
  code,
  language = "tsx",
  className,
}: DashboardCodeBlockProps) {
  const frameworkExamples = React.useMemo(() => {
    if (typeof code === "string") {
      return null;
    }

    const entries = (Object.entries(code) as [SupportedFramework, FrameworkCodeExample | undefined][]) // type-safe iteration
      .filter(([, value]) => Boolean(value?.code))
      .map(([framework, value]) => ({
        framework,
        code: value?.code ?? "",
        comment: value?.comment,
      }));

    if (!entries.length) {
      return null;
    }

    const order: SupportedFramework[] = ["nextjs", "react"];
    entries.sort((a, b) => order.indexOf(a.framework) - order.indexOf(b.framework));

    return entries;
  }, [code]);

  const [selectedFramework, setSelectedFramework] = React.useState<SupportedFramework | null>(
    frameworkExamples?.[0]?.framework ?? null
  );

  React.useEffect(() => {
    if (frameworkExamples?.length) {
      setSelectedFramework(frameworkExamples[0].framework);
      return;
    }

    setSelectedFramework(null);
  }, [frameworkExamples]);

  const activeExample = React.useMemo(() => {
    if (!frameworkExamples?.length) {
      return null;
    }

    const currentFramework = selectedFramework ?? frameworkExamples[0].framework;
    return (
      frameworkExamples.find((example) => example.framework === currentFramework) ??
      frameworkExamples[0]
    );
  }, [frameworkExamples, selectedFramework]);

  const activeCode =
    typeof code === "string" ? code : activeExample?.code ?? "";
  const activeComment =
    typeof code === "string" ? undefined : activeExample?.comment;

  const highlighted = useShikiHighlighter(
    activeCode,
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

  const showFrameworkSwitcher = Boolean(frameworkExamples && frameworkExamples.length > 1);

  return (
    <div
      className={cn(
        "scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-background-100 overflow-clip rounded-md border border-primary/10 bg-background-200",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 px-4 py-2">
        <span className="text-muted-foreground text-sm">{fileName}</span>
        {showFrameworkSwitcher ? (
          <div className="flex items-center gap-2">
            {frameworkExamples?.map(({ framework }) => {
              const meta = FRAMEWORK_META[framework];

              return (
                <button
                  key={framework}
                  type="button"
                  onClick={() => setSelectedFramework(framework)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedFramework === framework
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-transparent bg-background-100 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <meta.icon className="h-4 w-4" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {activeComment ? (
        <div className="border-b border-primary/10 px-4 py-2 text-muted-foreground text-sm">
          {activeComment}
        </div>
      ) : null}
      <div className="relative">
        <ComponentCodeReact code={activeCode}>{highlighted}</ComponentCodeReact>
      </div>
    </div>
  );
}
