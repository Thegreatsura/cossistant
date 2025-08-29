"use client";

import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Primitive from "../../primitive";
import { cn } from "../utils";

export interface ContainerProps {
  className?: string;
  children: React.ReactNode;
  mode?: "floating" | "responsive";
  position?: "top" | "bottom";
  align?: "right" | "left";
}

export const Container: React.FC<ContainerProps> = ({
  className,
  children,
  mode = "floating",
  position = "bottom",
  align = "right",
}) => {
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isScrollable = scrollHeight > clientHeight;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 5; // 5px threshold

    setShowScrollIndicator(isScrollable && !isAtBottom);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Instant initial check
    checkScroll();

    // Direct scroll listener on the container
    const handleScroll = () => {
      checkScroll();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    // Use ResizeObserver to detect content changes instantly
    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });

    resizeObserver.observe(container);

    // Also observe all child elements for dynamic content
    const mutationObserver = new MutationObserver(() => {
      checkScroll();
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [checkScroll]);

  return (
    <Primitive.Window asChild>
      <motion.div
        animate="visible"
        className={cn(
          // Common base styles
          "flex flex-col overflow-hidden overscroll-none bg-co-background",

          "max-md:fixed max-md:inset-0",

          // Desktop floating mode
          mode === "floating" && [
            "z-[9999] md:absolute md:z-[9900] md:aspect-[9/18] md:max-h-[calc(100vh-6rem)] md:w-[400px] md:rounded-lg md:border md:border-co-border/50 md:shadow-xl md:dark:shadow-co-background-600/50",
            position === "bottom" && "md:bottom-16",
            position === "top" && "md:top-16",
            align === "right" && "md:right-0",
            align === "left" && "md:left-0",
          ],

          // Desktop responsive mode
          mode === "responsive" &&
            "md:relative md:h-full md:w-full md:rounded-none md:border-0 md:shadow-none",

          className
        )}
        exit="exit"
        initial="hidden"
        transition={{
          default: { ease: "anticipate" },
          layout: { duration: 0.3 },
        }}
        variants={{
          hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
          visible: { opacity: 1, y: 0, filter: "blur(0px)" },
          exit: { opacity: 0, y: 10, filter: "blur(6px)" },
        }}
      >
        <div className="relative flex h-full w-full flex-col">
          {/* Scrollable content area */}
          <div
            className="flex flex-1 flex-col overflow-y-auto pt-18"
            ref={containerRef}
          >
            {children}
          </div>

          <AnimatePresence>
            {showScrollIndicator && (
              <>
                <motion.div
                  animate={{ opacity: 1 }}
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-5 h-32 bg-gradient-to-t from-co-background via-co-background/70 to-transparent"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                />
                <motion.div
                  animate={{ opacity: 0.6 }}
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-5 h-48 bg-gradient-to-t from-co-background/80 via-co-background/30 to-transparent"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut", delay: 0.05 }}
                />
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Primitive.Window>
  );
};
