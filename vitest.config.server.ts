import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  test: {
    include: ["server/tests/**/*.test.ts"],
    environment: "node",
    globals: true,
    setupFiles: ["server/tests/setup.ts"],
  },
});
