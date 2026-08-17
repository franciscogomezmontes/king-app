import { vi } from "vitest";

// botRoster.ts require()s real .jpg avatar files — the standard (only) way React Native
// resolves local image assets. Metro has a bundler transform for that; Vite/Vitest doesn't, and
// (unlike a plain `import`) a literal `require()` call bypasses Vite's own plugin/resolution
// pipeline entirely, running as a real Node require against the raw JPEG bytes and throwing a
// syntax error. Mocking the whole module means botRoster.ts's body — including those require()
// calls — never executes during tests at all. Vitest resolves this specifier relative to *this*
// file and matches it (by resolved absolute path, not literal specifier) against every other
// file's own import of "./botRoster" — a plain string literal is required here, not a
// `path.resolve(...)` call, since `vi.mock()` calls are hoisted above this file's own imports,
// so referencing an imported module (e.g. `path`) inside the call would throw a
// temporal-dead-zone ReferenceError. `pickBotRosterIndices`'s logic is small enough to mirror
// here directly (not `importOriginal`, which would still evaluate the real module and hit the
// same problem) — keep this in sync if that function's algorithm ever changes.
vi.mock("../src/game/botRoster", () => {
  const BOT_ROSTER = Array.from({ length: 10 }, (_, i) => ({
    name: `Bot${i}`,
    color: "#000000",
    image: 0,
  }));

  function pickBotRosterIndices(random: () => number, count: number): number[] {
    const indices = BOT_ROSTER.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, count);
  }

  return { BOT_ROSTER, pickBotRosterIndices };
});
