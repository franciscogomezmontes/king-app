import { describe, expect, it } from "vitest";
import { chooseCard } from "../src/index";

describe("chooseCard (placeholder)", () => {
  it("returns a legal card when given options", () => {
    const card = chooseCard([{ suit: "S", rank: 2 }]);
    expect(card).toEqual({ suit: "S", rank: 2 });
  });

  it("throws when given no legal cards", () => {
    expect(() => chooseCard([])).toThrow();
  });
});
