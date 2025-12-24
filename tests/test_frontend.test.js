import { describe, it, expect } from "vitest";

import "../static/js/app.js";

const hooks = globalThis.window.__poHelperTestHooks;

describe("frontend helpers", () => {
  it("normalizes tag classes", () => {
    expect(hooks.normalizeTagClass("  My Tag ")).toBe("tag-my-tag");
    expect(hooks.normalizeTagClass("$$$")).toBe("");
  });

  it("parses tag values", () => {
    expect(hooks.parseTagsValue("a, b, , c")).toEqual(["a", "b", "c"]);
    expect(hooks.parseTagsValue("")).toEqual([]);
  });

  it("sorts manual order with fallback to created_at/id", () => {
    const a = { order_index: 2, created_at: "2025-01-01T00:00:00Z", id: 1 };
    const b = { order_index: 1, created_at: "2025-01-02T00:00:00Z", id: 2 };
    expect(hooks.compareManualOrder(a, b)).toBeGreaterThan(0);
  });
});
