import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/Node-only packages must not be bundled.
  serverExternalPackages: ["unpdf", "mammoth", "pdfjs-dist"],
  experimental: {
    proxyClientMaxBodySize: "60mb",
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
