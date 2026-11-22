import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/*/test/**/*.test.ts"],
    setupFiles: ["packages/deepseek/test/setup.ts"],
    coverage: {
      provider: "v8",
      enabled: true,
      include: ["packages/*/src/**/*.ts", "packages/*/extensions/**/*.ts"],
      exclude: ["**/*.d.ts"],
      reporter: [["text", { skipFull: false }], "json-summary", "html"],
      reportsDirectory: "coverage",
      reportOnFailure: true,
      skipFull: false,
      thresholds: {
        100: true,
        perFile: true,
        autoUpdate: false,
      },
    },
  },
});
