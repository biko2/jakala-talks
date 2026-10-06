import path from "path";
import type { NextConfig } from "next";

const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      tailwindcss: path.join(projectRoot, "node_modules/tailwindcss"),
    },
  },
};

export default nextConfig;
