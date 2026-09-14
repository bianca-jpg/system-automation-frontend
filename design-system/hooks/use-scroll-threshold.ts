"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if the page has been scrolled past a threshold
 * @param threshold - The scroll position threshold in pixels (default: 10)
 * @returns Object with isScrolled boolean
 */
export function useScrollThreshold(threshold: number = 10): {
  isScrolled: boolean;
} {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsScrolled(window.scrollY > threshold);

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const scrolled = window.scrollY > threshold;
        setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
      }, 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  return { isScrolled };
}
