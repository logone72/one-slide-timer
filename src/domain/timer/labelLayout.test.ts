import { describe, expect, it } from "vitest";

import { layoutLabels } from "./labelLayout";

describe("label layout", () => {
  it("keeps crowded labels apart and inside the rail", () => {
    expect(
      layoutLabels(
        [
          { id: "a", position: 90, size: 40 },
          { id: "b", position: 90, size: 40 },
          { id: "c", position: 0, size: 20 },
        ],
        100
      )
    ).toEqual([
      { id: "c", position: 0, size: 20 },
      { id: "a", position: 20, size: 40 },
      { id: "b", position: 60, size: 40 },
    ]);
    expect(layoutLabels([], 100)).toEqual([]);
    expect(
      layoutLabels([{ id: "a", position: 0, size: 40 }], 100)[0]?.position
    ).toBe(0);
  });
});
