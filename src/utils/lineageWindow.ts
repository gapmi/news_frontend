export interface LineageWindow {
  startRunId: number;
  endRunId: number;
  runIds: number[];
  anchorIndex: number;
}

export function getLineageWindow(
  runIds: number[],
  anchorRunId: number,
  radius = 5,
): LineageWindow | null {
  if (runIds.length === 0) return null;

  const anchorIndex = runIds.indexOf(anchorRunId);
  if (anchorIndex === -1) return null;

  const desiredSize = Math.min(runIds.length, radius * 2 + 1);

  let startIndex = Math.max(0, anchorIndex - radius);
  let endIndex = Math.min(runIds.length - 1, anchorIndex + radius);

  while (endIndex - startIndex + 1 < desiredSize) {
    if (startIndex > 0) {
      startIndex -= 1;
    } else if (endIndex < runIds.length - 1) {
      endIndex += 1;
    } else {
      break;
    }
  }

  const visibleRunIds = runIds.slice(startIndex, endIndex + 1);

  return {
    startRunId: visibleRunIds[0],
    endRunId: visibleRunIds[visibleRunIds.length - 1],
    runIds: visibleRunIds,
    anchorIndex: visibleRunIds.indexOf(anchorRunId),
  };
}