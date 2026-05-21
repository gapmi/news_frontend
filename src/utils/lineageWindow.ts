export interface LineageWindow {
  startRunId: number;
  endRunId: number;
  runIds: number[];
}

export function getLineageWindow(
  runIds: number[],
  anchorRunId: number,
  radius = 5,
): LineageWindow | null {
  if (runIds.length === 0) {
    return null;
  }

  const anchorIndex = runIds.indexOf(anchorRunId);

  if (anchorIndex === -1) {
    return null;
  }

  const desiredSize = radius * 2 + 1;

  let startIndex = Math.max(0, anchorIndex - radius);
  let endIndex = Math.min(runIds.length - 1, anchorIndex + radius);

  let currentSize = endIndex - startIndex + 1;

  if (currentSize < desiredSize) {
    const missing = desiredSize - currentSize;

    const canGrowLeft = startIndex > 0;
    const canGrowRight = endIndex < runIds.length - 1;

    if (!canGrowLeft && canGrowRight) {
      endIndex = Math.min(runIds.length - 1, endIndex + missing);
    } else if (canGrowLeft && !canGrowRight) {
      startIndex = Math.max(0, startIndex - missing);
    } else if (canGrowLeft && canGrowRight) {
      const growLeft = Math.min(startIndex, Math.ceil(missing / 2));
      const growRight = Math.min(runIds.length - 1 - endIndex, missing - growLeft);

      startIndex -= growLeft;
      endIndex += growRight;

      currentSize = endIndex - startIndex + 1;

      if (currentSize < desiredSize && startIndex > 0) {
        startIndex = Math.max(0, startIndex - (desiredSize - currentSize));
      }

      currentSize = endIndex - startIndex + 1;

      if (currentSize < desiredSize && endIndex < runIds.length - 1) {
        endIndex = Math.min(runIds.length - 1, endIndex + (desiredSize - currentSize));
      }
    }
  }

  const windowRunIds = runIds.slice(startIndex, endIndex + 1);

  return {
    startRunId: windowRunIds[0],
    endRunId: windowRunIds[windowRunIds.length - 1],
    runIds: windowRunIds,
  };
}