"use client";

import type { ReactNode } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  DEFAULT_SIDEBAR_WIDTH,
  type SidebarPosition,
  useSidebar,
} from "@/hooks/use-sidebars";
import { cn } from "@/lib/utils";
import { TooltipOnHover } from "../../tooltip";

type ResizableSidebarProps = {
  className?: string;
  children: ReactNode;
  position: SidebarPosition;
};

export const ResizableSidebar = ({
  className,
  children,
  position,
}: ResizableSidebarProps) => {
  const { open, toggle } = useSidebar({ position });

  return (
    <>
      <aside
        className={cn(
          "relative flex p-0 transition-all duration-200 ease-in-out",
          className,
          {
            "ml-[0px] p-0": !open,
            "border-r": position === "left",
            "border-l": position === "right",
            "border-transparent": !open,
          }
        )}
        style={{
          width: open ? DEFAULT_SIDEBAR_WIDTH : 0,
        }}
      >
        {open && (
          <>
            {children}
            <SidebarHandle
              hotkeys={[position === "right" ? "bracketright" : "bracketleft"]}
              isCollapsed={!open}
              onToggle={toggle}
              position={position === "right" ? "left" : "right"}
            />
          </>
        )}
        {!open && (
          <SidebarHandle
            hotkeys={[position === "right" ? "bracketright" : "bracketleft"]}
            isCollapsed={!open}
            onToggle={toggle}
            position={position === "right" ? "left" : "right"}
          />
        )}
      </aside>
    </>
  );
};

type SidebarHandleProps = {
  isCollapsed?: boolean;
  onToggle: () => void;
  hotkeys?: string[];
  position?: "left" | "right";
  onClose?: () => void;
};

const SidebarHandle = ({
  isCollapsed,
  onToggle,
  hotkeys = ["bracketleft"],
  position = "right",
  onClose,
}: SidebarHandleProps) => {
  // Open the open on key stroke
  useHotkeys(
    hotkeys.join("+"), // Join with + for proper hotkey format (e.g., "shift+left")
    () => {
      onToggle();
    },
    {
      preventDefault: true,
    }
  );

  const handleClick = () => {
    onToggle();
    onClose?.();
  };

  const tooltipContent = isCollapsed ? (
    "Click to open"
  ) : (
    <div className="flex flex-col gap-1">
      <span>Click to close</span>
    </div>
  );

  // Map keyboard key names to display-friendly versions for tooltip
  const displayShortcuts = hotkeys.map((key) => {
    switch (key) {
      case "bracketleft":
        return "[";
      case "bracketright":
        return "]";
      default:
        return key;
    }
  });

  return (
    <button
      className={cn(
        "absolute top-0.5 bottom-0.5 z-10 hidden max-h-screen w-[2px] items-center justify-center rounded-full hover:cursor-pointer hover:bg-border md:flex",
        {
          "-right-[1px]": !isCollapsed && position === "right",
          "-left-[1px]": !isCollapsed && position === "left",
        }
      )}
      onClick={handleClick}
      tabIndex={0}
      type="button"
    >
      <TooltipOnHover
        content={tooltipContent}
        delay={1000}
        shortcuts={displayShortcuts}
        side="right"
      >
        <div
          className={cn(
            "group flex h-full items-center justify-center border-transparent transition-all hover:cursor-pointe",
            position === "left" ? "border-r-4" : "border-l-4"
          )}
        >
          <div
            className={cn(
              "h-fit w-4 flex flex-col items-center justify-start hover:cursor-pointer",
              {
                "mr-3": position === "left",
                "ml-3": position === "right",
              }
            )}
          >
            {position === "right" ? (
              <>
                <div
                  className={cn(
                    "-mb-[3px] h-4 w-[2px] rounded bg-border/90 transition-all group-hover:h-6 group-hover:rotate-6 group-hover:bg-background-600",
                    {
                      "group-hover:-rotate-6 bg-background-700": isCollapsed,
                    }
                  )}
                />
                <div
                  className={cn(
                    "-mt-[3px] group-hover:-rotate-6 h-4 w-[2px] rounded bg-border/90 transition-all group-hover:h-6 group-hover:bg-background-600",
                    {
                      "group-hover:rotate-6 bg-background-700": isCollapsed,
                    }
                  )}
                />
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "-mb-[3px] group-hover:-rotate-6 h-4 w-[2px] rounded bg-border/90 transition-all group-hover:h-6 group-hover:bg-background-600",
                    {
                      "group-hover:-rotate-6 bg-background-700": isCollapsed,
                    }
                  )}
                />
                <div
                  className={cn(
                    "-mt-[3px] h-4 w-[2px] rounded bg-border/90 transition-all group-hover:h-6 group-hover:rotate-6 group-hover:bg-background-600",
                    {
                      "group-hover:rotate-6 bg-background-700": isCollapsed,
                    }
                  )}
                />
              </>
            )}
          </div>
        </div>
      </TooltipOnHover>
    </button>
  );
};
