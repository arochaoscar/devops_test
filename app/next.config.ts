/**
 * Next.js Configuration
 *
 * output: "standalone" — produces a minimal self-contained build that
 * includes only the files needed to run the app (no node_modules).
 * This is required for the Docker production image, where the standalone
 * output is copied into the final stage without the full node_modules tree.
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
