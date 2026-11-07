import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // See test/setup.ts: mocks botRoster.ts so its require()'d .jpg avatar files (Metro-only
    // asset syntax Vite/Vitest has no transform for) never actually get evaluated during tests.
    setupFiles: ["./test/setup.ts"],
  },
});
