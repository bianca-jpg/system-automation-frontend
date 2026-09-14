import type { NextConfig } from "next";

const config: NextConfig = {
  outputFileTracingRoot: __dirname,
  transpilePackages: ["@system-automation/design-system"],
  images: {
    qualities: [100, 75],
  },
};

export default config;
