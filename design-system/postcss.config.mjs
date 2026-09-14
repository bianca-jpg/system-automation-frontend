/**
 * PostCSS configuration for Storybook to process storybook.css with Tailwind 4.
 *
 * The DS package needs its own postcss.config so Vite (via @storybook/nextjs-vite)
 * can run the Tailwind 4 plugin against the imported Storybook entry. Without this,
 * Storybook's Vite pipeline does not invoke Tailwind 4 explicitly when it
 * encounters `@import "tailwindcss"`, and utility classes from stories/ don't
 * get scanned and emitted.
 *
 * Class scanning still respects the selected entry point: globals.css scans
 * production components/lib and excludes `*.stories.*`; storybook.css adds
 * both colocated stories and the top-level stories/ catalog.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
