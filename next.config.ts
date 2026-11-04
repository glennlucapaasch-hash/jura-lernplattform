import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/Node-only packages must not be bundled.
  serverExternalPackages: ["better-sqlite3", "unpdf", "mammoth", "pdfjs-dist"],
  proxyClientMaxBodySize: "60mb",
  experimental: {
    serverActions: { bodySizeLimit: "60mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
