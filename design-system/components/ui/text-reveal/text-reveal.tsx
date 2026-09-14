"use client";

import type { CSSProperties } from "react";
import { motion, type Transition, useReducedMotion } from "framer-motion";

import { cn } from "../../../lib/utils";

interface TextSegment {
  text: string;
  className?: string;
}

interface TextRevealProps {
  segments: TextSegment[];
  className?: string | undefined;
  style?: CSSProperties | undefined;
  delay?: number | undefined;
  stagger?: number | undefined;
  duration?: number | undefined;
  ease?: NonNullable<Transition["ease"]> | undefined;
  yOffset?: number | string | undefined;
}

/**
 * A preferência de movimento NÃO pode mudar a ÁRVORE renderizada.
 *
 * A versão anterior tinha um `if (prefersReducedMotion) return (...)` com
 * markup diferente. `useReducedMotion()` devolve `null` no servidor (não há
 * `matchMedia`) e `true` no cliente de quem tem `prefers-reduced-motion:
 * reduce` — ou seja, para esse usuário o HTML do servidor e o primeiro render
 * do cliente divergiam em classe, `style` e estrutura, e o React abortava a
 * hidratação daquela subárvore ("A tree hydrated but some attributes of the
 * server rendered HTML didn't match the client properties").
 *
 * Agora existe UMA árvore só. A preferência entra apenas no TEMPO da
 * transição, que não aparece no markup do servidor: com movimento reduzido a
 * transição dura 0s, então a palavra aparece no lugar final sem deslocamento
 * perceptível.
 */
export function TextReveal({
  segments,
  className,
  style,
  delay = 0,
  stagger = 0.03,
  duration = 0.3,
  ease = [0.25, 0.46, 0.45, 0.94],
  yOffset = 15,
}: TextRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const accessibleText = segments
    .map((segment) => segment.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const container = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : stagger,
        delayChildren: prefersReducedMotion ? 0 : delay,
      },
    },
  };

  const child = {
    visible: {
      y: 0,
      transition: {
        type: "tween" as const,
        duration: prefersReducedMotion ? 0 : duration,
        ease,
      },
    },
    hidden: {
      // `yOffset` é o mesmo nos dois lados de propósito: ele entra no markup
      // que o servidor emite, então não pode depender da preferência.
      y: yOffset,
    },
  };

  return (
    <motion.span
      data-slot="text-reveal"
      className={cn("flex flex-wrap text-foreground", className)}
      style={
        // motion.span accepts MotionStyle which differs from CSSProperties on
        // animatable values; cast through unknown is safe since the spread
        // only includes plain CSSProperties values (no MotionValue).
        { ...style, transform: "translateZ(0)" } as unknown as Exclude<
          Parameters<typeof motion.span>[0]["style"],
          undefined
        >
      }
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-5%" }}
    >
      <span data-slot="text-reveal-accessible" className="sr-only">
        {accessibleText}
      </span>
      <span
        data-slot="text-reveal-visual"
        className="contents"
        aria-hidden="true"
      >
        {segments.map((segment, segmentIndex) =>
          segment.text.split(" ").map((word, wordIndex) => {
            if (!word) return null;

            return (
              <span
                key={`${segmentIndex}-${wordIndex}`}
                data-slot="text-reveal-word"
                className="mr-[0.25em] inline-block overflow-hidden pb-[0.08em] -mb-[0.08em]"
              >
                <motion.span
                  variants={child}
                  className={cn("inline-block", segment.className)}
                  style={{ willChange: "transform" }}
                >
                  {word}
                </motion.span>
              </span>
            );
          }),
        )}
      </span>
    </motion.span>
  );
}
