export type LabelInput = {
  id: string;
  position: number;
  size: number;
};

export type LabelLayout = LabelInput & {
  lane: number;
};

export function layoutLabels(labels: LabelInput[]): LabelLayout[] {
  const laneEnds: number[] = [];

  return [...labels]
    .sort((a, b) => a.position - b.position)
    .map((label) => {
      const lane = laneEnds.findIndex((end) => end <= label.position);
      const nextLane = lane === -1 ? laneEnds.length : lane;
      laneEnds[nextLane] = label.position + label.size;

      return {
        ...label,
        lane: nextLane,
      };
    });
}
