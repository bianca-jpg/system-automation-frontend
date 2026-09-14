"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "../../../lib/utils";

interface ShimmeringTextProps {
  text: string;
  className?: string;
  textClassName?: string;
  transitionDuration?: number;
  yOffset?: number;
}

export function ShimmeringText({
  text,
  className,
  textClassName,
  transitionDuration = 0.32,
  yOffset = 12,
}: ShimmeringTextProps) {
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion ? 0 : yOffset;
  const duration = reduceMotion ? 0.01 : transitionDuration;

  return (
    <span
      aria-live="polite"
      role="status"
      data-slot="shimmering-text"
      className={cn(
        "relative inline-flex min-h-[1rem] items-center overflow-hidden align-middle",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          initial={{
            opacity: 0,
            y: offset,
            filter: reduceMotion ? "none" : "blur(1px)",
          }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{
            opacity: 0,
            y: -offset,
            filter: reduceMotion ? "none" : "blur(1px)",
          }}
          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
          className={cn("shimmer-text inline-block select-none", textClassName)}
          data-slot="shimmering-text-inner"
          data-text={text}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
