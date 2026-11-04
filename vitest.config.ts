import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts") } },
  test: { include: ["tests/**/*.test.ts"], environment: "node", env: { DATA_DIR: process.env.TEST_DATA_DIR || "/tmp/jura-test-data" } },
});
