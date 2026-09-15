export type LabelInput = { id: string; position: number; size: number };

export function layoutLabels(
  labels: LabelInput[],
  height: number
): LabelInput[] {
  let edge = 0;
  const placed = [...labels]
    .sort((a, b) => a.position - b.position)
    .map((label) => {
      const position = Math.max(edge, label.position - label.size / 2);
      edge = position + label.size;
      return { ...label, position };
    });
  edge = height;
  for (let index = placed.length - 1; index >= 0; index -= 1) {
    const label = placed[index];
    if (label !== undefined) {
      label.position = Math.min(label.position, edge - label.size);
      edge = label.position;
    }
  }
  return placed;
}
