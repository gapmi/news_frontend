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
    return r1 + r2 + 4;
  }

  if (targetOverlap >= maxOverlap) {
    return Math.abs(r1 - r2);
  }

  let low = Math.abs(r1 - r2);
  let high = r1 + r2;

  for (let i = 0; i < 48; i += 1) {
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

    const baseScale = 7;
    const r1 = Math.sqrt(parentArea / Math.PI) * baseScale;
    const r2 = Math.sqrt(childArea / Math.PI) * baseScale;
    const d = solveCircleDistance(r1, r2, intersectionArea);

    const width = 520;
    const height = 320;
    const leftCx = 180;
    const rightCx = leftCx + d;
    const cy = 150;

    const minX = Math.min(leftCx - r1, rightCx - r2);
    const maxX = Math.max(leftCx + r1, rightCx + r2);
    const diagramWidth = maxX - minX;

    let scale = 1;
    const maxAllowedWidth = 360;
    const maxAllowedHeight = 180;

    if (diagramWidth > maxAllowedWidth) {
      scale = Math.min(scale, maxAllowedWidth / diagramWidth);
    }
    if (Math.max(r1, r2) * 2 > maxAllowedHeight) {
      scale = Math.min(scale, maxAllowedHeight / (Math.max(r1, r2) * 2));
    }

    const pr = r1 * scale;
    const cr = r2 * scale;
    const pd = d * scale;

    const parentCx = 180;
    const childCx = parentCx + pd;
    const centerY = cy;

    return {
      width,
      height,
      parentCx,
      childCx,
      centerY,
      pr,
      cr,
    };
  }, [detail]);

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
          className="h-auto w-full min-w-[420px]"
          role="img"
          aria-label={`Euler overlap for parent cluster ${detail.parent.clusterId} and child cluster ${detail.child.clusterId}`}
        >
          <defs>
            <clipPath id={`parent-clip-${detail.edgeId}`}>
              <circle
                cx={diagram.parentCx}
                cy={diagram.centerY}
                r={diagram.pr}
              />
            </clipPath>

            <clipPath id={`child-clip-${detail.edgeId}`}>
              <circle
                cx={diagram.childCx}
                cy={diagram.centerY}
                r={diagram.cr}
              />
            </clipPath>
          </defs>

          <circle
            cx={diagram.parentCx}
            cy={diagram.centerY}
            r={diagram.pr}
            fill="#93c5fd"
            fillOpacity="0.45"
            stroke="#2563eb"
            strokeWidth="2"
          />
          <circle
            cx={diagram.childCx}
            cy={diagram.centerY}
            r={diagram.cr}
            fill="#c4b5fd"
            fillOpacity="0.45"
            stroke="#7c3aed"
            strokeWidth="2"
          />

          <g clipPath={`url(#parent-clip-${detail.edgeId})`}>
            <circle
              cx={diagram.childCx}
              cy={diagram.centerY}
              r={diagram.cr}
              fill="#60a5fa"
              fillOpacity="0.5"
            />
          </g>

          <text
            x={diagram.parentCx}
            y={40}
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            fill="#1d4ed8"
          >
            {`Parent C${detail.parent.clusterId}`}
          </text>
          <text
            x={diagram.parentCx}
            y={58}
            textAnchor="middle"
            fontSize="11"
            fill="#1e40af"
          >
            {`size ${detail.parent.size}`}
          </text>

          <text
            x={diagram.childCx}
            y={40}
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            fill="#6d28d9"
          >
            {`Child C${detail.child.clusterId}`}
          </text>
          <text
            x={diagram.childCx}
            y={58}
            textAnchor="middle"
            fontSize="11"
            fill="#6d28d9"
          >
            {`size ${detail.child.size}`}
          </text>

          <text
            x={(diagram.parentCx + diagram.childCx) / 2}
            y={diagram.centerY + 8}
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill="#111827"
          >
            {detail.overlap.count}
          </text>
          <text
            x={(diagram.parentCx + diagram.childCx) / 2}
            y={diagram.centerY + 26}
            textAnchor="middle"
            fontSize="11"
            fill="#6b7280"
          >
            overlap
          </text>
        </svg>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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