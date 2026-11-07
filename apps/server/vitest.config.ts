import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // "threads" (worker_threads), not the default — Colyseus registers a `process.on("message")`
    // handler that collides with vitest's own IPC channel under the "forks" pool.
    pool: "threads",
    // @colyseus/testing@0.16.3's boot() has a real bug: when given a Server instance (not a
    // ConfigOptions object, which is what createGameServer() returns), it ignores the `port`
    // argument entirely and always binds its hardcoded DEFAULT_TEST_PORT (2568). Running test
    // files in parallel would make every file's beforeAll race for that same port — force them
    // sequential instead so each file's afterAll releases it before the next file's beforeAll
    // binds it again.
    fileParallelism: false,
  },
});
