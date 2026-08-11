import { describe, expect, it } from "vitest";
import { defaultLabels, resolveLabels } from "./config.js";

describe("resolveLabels", () => {
  it("returns the defaults untouched when nothing is overridden", () => {
    expect(resolveLabels()).toBe(defaultLabels);
    expect(resolveLabels(undefined).allStages).toBe("All stages");
  });

  it("merges a partial override without dropping the rest", () => {
    const labels = resolveLabels({ allStages: "Semua pentas" });
    expect(labels.allStages).toBe("Semua pentas");
    // untouched keys still resolve
    expect(labels.searchPlaceholder).toBe(defaultLabels.searchPlaceholder);
  });

  it("supports overriding the pluralising functions", () => {
    const labels = resolveLabels({
      inParallel: (n) => `${n} serentak`,
      sessionsCount: (shown, total) => `${shown}/${total} sesi`,
    });
    expect(labels.inParallel(3)).toBe("3 serentak");
    expect(labels.sessionsCount(2, 9)).toBe("2/9 sesi");
  });

  it("does not mutate the shared defaults", () => {
    resolveLabels({ allStages: "changed" });
    expect(defaultLabels.allStages).toBe("All stages");
  });

  it("keeps every default label non-empty", () => {
    for (const [key, value] of Object.entries(defaultLabels)) {
      if (typeof value === "string") {
        expect(value.length, `${key} should not be empty`).toBeGreaterThan(0);
      }
    }
  });
});
