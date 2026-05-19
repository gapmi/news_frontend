import { useMemo } from "react";
import type { EulerPairDetail } from "@/api/clustering";

type Props = {
  detail: EulerPairDetail;
};

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function circleOverlapArea(r1: number, r2: number, d: number) {
  if (d >= r1 + r2) {
    return 0;
  }

  if (d <= Math.abs(r1 - r2)) {
    const r = Math.min(r1, r2);
    return Math.PI * r * r;
  }

  const alpha = Math.acos(
    clamp((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1),
  );
  const beta = Math.acos(
    clamp((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1),
  );

  return (
    r1 * r1 * alpha +
    r2 * r2 * beta -
    0.5 *
      Math.sqrt(
        Math.max(
          0,
          (-d + r1 + r2) *
            (d + r1 - r2) *
            (d - r1 + r2) *
            (d + r1 + r2),
        ),
      )
  );
}

function solveCircleDistance(r1: number, r2: number, targetOverlap: number) {
  const maxOverlap = Math.PI * Math.min(r1, r2) ** 2;

  if (targetOverlap <= 0) {
    return r1 + r2 + 8;
  }

  if (targetOverlap >= maxOverlap) {
    return Math.abs(r1 - r2);
  }

  let low = Math.abs(r1 - r2);
  let high = r1 + r2;

  for (let i = 0; i < 56; i += 1) {
    const mid = (low + high) / 2;
    const overlap = circleOverlapArea(r1, r2, mid);

    if (overlap > targetOverlap) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

export default function EulerOverlapDiagram({ detail }: Props) {
  const diagram = useMemo(() => {
    const parentArea = Math.max(detail.circles.parentArea, 1);
    const childArea = Math.max(detail.circles.childArea, 1);
    const intersectionArea = clamp(
      detail.circles.intersectionArea,
      0,
      Math.min(parentArea, childArea),
    );

    const baseScale = 10;
    const rawParentRadius = Math.sqrt(parentArea / Math.PI) * baseScale;
    const rawChildRadius = Math.sqrt(childArea / Math.PI) * baseScale;
    const rawDistance = solveCircleDistance(
      rawParentRadius,
      rawChildRadius,
      intersectionArea,
    );

    const width = 720;
    const height = 420;

    const horizontalPadding = 70;
    const topPadding = 110;
    const bottomPadding = 60;

    const rawLeft = 220 - rawParentRadius;
    const rawRight = 220 + rawDistance + rawChildRadius;
    const rawDiagramWidth = rawRight - rawLeft;
    const rawDiagramHeight = Math.max(rawParentRadius, rawChildRadius) * 2;

    const usableWidth = width - horizontalPadding * 2;
    const usableHeight = height - topPadding - bottomPadding;

    const scale = Math.min(
      usableWidth / Math.max(rawDiagramWidth, 1),
      usableHeight / Math.max(rawDiagramHeight, 1),
      1.35,
    );

    const parentRadius = rawParentRadius * scale;
    const childRadius = rawChildRadius * scale;
    const distance = rawDistance * scale;

    const centerY = topPadding + usableHeight / 2;
    const parentCx = width / 2 - distance / 2;
    const childCx = width / 2 + distance / 2;

    return {
      width,
      height,
      centerY,
      parentCx,
      childCx,
      parentRadius,
      childRadius,
    };
  }, [detail]);

  const overlapCenterX = (diagram.parentCx + diagram.childCx) / 2;

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-3">
        <h3 className="text-base font-medium">{detail.labels.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.labels.subtitle}
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${diagram.width} ${diagram.height}`}
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-label={`Euler overlap for parent cluster ${detail.parent.clusterId} and child cluster ${detail.child.clusterId}`}
        >
          <defs>
            <clipPath id={`parent-clip-${detail.edgeId}`}>
              <circle
                cx={diagram.parentCx}
                cy={diagram.centerY}
                r={diagram.parentRadius}
              />
            </clipPath>
          </defs>

          <circle
            cx={diagram.parentCx}
            cy={diagram.centerY}
            r={diagram.parentRadius}
            fill="#93c5fd"
            fillOpacity="0.45"
            stroke="#2563eb"
            strokeWidth="3"
          />

          <circle
            cx={diagram.childCx}
            cy={diagram.centerY}
            r={diagram.childRadius}
            fill="#c4b5fd"
            fillOpacity="0.45"
            stroke="#7c3aed"
            strokeWidth="3"
          />

          <g clipPath={`url(#parent-clip-${detail.edgeId})`}>
            <circle
              cx={diagram.childCx}
              cy={diagram.centerY}
              r={diagram.childRadius}
              fill="#60a5fa"
              fillOpacity="0.55"
            />
          </g>

          <text
            x={diagram.parentCx}
            y={38}
            textAnchor="middle"
            fontSize="18"
            fontWeight="700"
            fill="#1d4ed8"
          >
            {`Parent C${detail.parent.clusterId}`}
          </text>
          <text
            x={diagram.parentCx}
            y={62}
            textAnchor="middle"
            fontSize="14"
            fill="#1e40af"
          >
            {`size ${detail.parent.size}`}
          </text>

          <text
            x={diagram.childCx}
            y={38}
            textAnchor="middle"
            fontSize="18"
            fontWeight="700"
            fill="#6d28d9"
          >
            {`Child C${detail.child.clusterId}`}
          </text>
          <text
            x={diagram.childCx}
            y={62}
            textAnchor="middle"
            fontSize="14"
            fill="#6d28d9"
          >
            {`size ${detail.child.size}`}
          </text>

          <text
            x={overlapCenterX}
            y={diagram.centerY - 4}
            textAnchor="middle"
            fontSize="26"
            fontWeight="800"
            fill="#111827"
          >
            {detail.overlap.count}
          </text>
          <text
            x={overlapCenterX}
            y={diagram.centerY + 20}
            textAnchor="middle"
            fontSize="13"
            fill="#4b5563"
          >
            overlap
          </text>
        </svg>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Parent coverage</div>
          <div className="text-sm font-medium">
            {formatNumber(detail.overlap.parentCoverage, 3)}
          </div>
        </div>

        <div className="rounded-md border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Child coverage</div>
          <div className="text-sm font-medium">
            {formatNumber(detail.overlap.childCoverage, 3)}
          </div>
        </div>

        <div className="rounded-md border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Jaccard</div>
          <div className="text-sm font-medium">
            {formatNumber(detail.overlap.jaccard, 3)}
          </div>
        </div>

        <div className="rounded-md border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Score</div>
          <div className="text-sm font-medium">
            {formatNumber(detail.metrics.score, 3)}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {detail.labels.explanation}
      </p>
    </div>
  );
}