import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly declare the monorepo root so Next.js doesn't guess from lockfiles.
    // CSS resolution still works because postcss.config.mjs pins `base` to frontend/.
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
