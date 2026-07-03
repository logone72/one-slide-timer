import { describe, expect, it } from "vitest";

import { layoutLabels } from "./labelLayout";

describe("label layout", () => {
  it("places overlapping labels on the first free lane", () => {
    expect(
      layoutLabels([
        { id: "a", position: 0, size: 40 },
        { id: "b", position: 20, size: 40 },
        { id: "c", position: 45, size: 20 },
      ])
    ).toEqual([
      { id: "a", position: 0, size: 40, lane: 0 },
      { id: "b", position: 20, size: 40, lane: 1 },
      { id: "c", position: 45, size: 20, lane: 0 },
    ]);
  });
});
