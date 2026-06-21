import { useMemo, useState } from "react";
import type {
  ClusterRadialMap,
  RadialPoint,
  RadialRing,
  RadialSector,
} from "@/api/clustering";

type Props = {
  radialMap: ClusterRadialMap | null | undefined;
  title?: string;
};

const SVG_SIZE = 520;
const CENTER = SVG_SIZE / 2;
const OUTER_RADIUS = 210;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value: number | null | undefined, digits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : "—";
}

function polarToCartesian(radius: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function describeArc(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngleDeg: number,
  endAngleDeg: number,
) {
  const startOuter = polarToCartesian(outerRadius, endAngleDeg);
  const endOuter = polarToCartesian(outerRadius, startAngleDeg);
  const startInner = polarToCartesian(innerRadius, startAngleDeg);
  const endInner = polarToCartesian(innerRadius, endAngleDeg);

  const delta = ((endAngleDeg - startAngleDeg) % 360 + 360) % 360;
  const largeArcFlag = delta > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

function getSectorFill(index: number) {
  const palette = [
    "#dbeafe",
    "#ede9fe",
    "#dcfce7",
    "#fef3c7",
    "#fee2e2",
    "#e0f2fe",
    "#fce7f3",
    "#ecfccb",
  ];
  return palette[index % palette.length];
}

function getPointColor(point: RadialPoint) {
  if (point.isOutlier) return "#dc2626";
  if (point.isQuestionable) return "#ea580c";
  if (point.isOutlierRisk) return "#d97706";
  if (point.isEdge) return "#7c3aed";
  if (point.isCore) return "#2563eb";
  return "#64748b";
}

function getPointRadius(point: RadialPoint) {
  if (point.isOutlier) return 4.5;
  if (point.isQuestionable) return 4;
  if (point.isOutlierRisk) return 4;
  return 3.2;
}

function normalizeRings(rings: RadialRing[]) {
  const maxOuter = Math.max(...rings.map((ring) => ring.radiusOuter), 1);
  return rings.map((ring) => ({
    ...ring,
    inner: (ring.radiusInner / maxOuter) * OUTER_RADIUS,
    outer: (ring.radiusOuter / maxOuter) * OUTER_RADIUS,
  }));
}

function resolvePointPosition(
  point: RadialPoint,
  maxPointRadius: number,
  useCartesian: boolean,
) {
  if (useCartesian) {
    return {
      x: CENTER + point.x * OUTER_RADIUS,
      y: CENTER + point.y * OUTER_RADIUS,
    };
  }

  const normalizedRadius =
    maxPointRadius > 0 ? (point.radius / maxPointRadius) * OUTER_RADIUS : 0;

  return polarToCartesian(normalizedRadius, point.angleDeg);
}

export default function ClusterRadialMap({
  radialMap,
  title = "Radial map",
}: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<RadialPoint | null>(null);

  const prepared = useMemo(() => {
    if (!radialMap) return null;

    const rings = normalizeRings(radialMap.rings ?? []);
    const sectors = radialMap.sectors ?? [];
    const points = radialMap.points ?? [];

    const maxPointRadius = Math.max(...points.map((point) => point.radius), 1);

    const cartesianLooksValid =
      points.length > 0 &&
      points.every(
        (point) =>
          Number.isFinite(point.x) &&
          Number.isFinite(point.y) &&
          Math.abs(point.x) <= 1.25 &&
          Math.abs(point.y) <= 1.25,
      );

    return {
      rings,
      sectors,
      points,
      maxPointRadius,
      useCartesian: cartesianLooksValid,
    };
  }, [radialMap]);

  if (!radialMap) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-4 py-6 text-sm text-muted-foreground">
        Radial map is unavailable for this cluster.
      </div>
    );
  }

  if ((radialMap.points?.length ?? 0) === 0) {
    return (
      <div className="rounded-xl border bg-background p-4">
        <div className="mb-4">
          <h3 className="text-base font-medium">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Radial structure is enabled, but this cluster has no plotted points yet.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Articles</div>
            <div className="text-sm font-medium">{radialMap.stats.articleCount}</div>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Rings</div>
            <div className="text-sm font-medium">{radialMap.ringCount}</div>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Sectors</div>
            <div className="text-sm font-medium">{radialMap.sectorCount}</div>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Subclusters</div>
            <div className="text-sm font-medium">{radialMap.stats.subclusterCount}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border bg-background p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ring mode {radialMap.ringMode} · sector mode {radialMap.sectorMode} · version{" "}
            {radialMap.version}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <div className="rounded-md border bg-card px-3 py-2">
            Articles <span className="font-medium text-foreground">{radialMap.stats.articleCount}</span>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            Core <span className="font-medium text-foreground">{radialMap.stats.coreCount}</span>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            Edge <span className="font-medium text-foreground">{radialMap.stats.edgeCount}</span>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            Outliers <span className="font-medium text-foreground">{radialMap.stats.outlierCount}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-x-auto rounded-xl border bg-card/40 p-3">
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className="mx-auto h-auto w-full min-w-[360px] max-w-[520px]"
            role="img"
            aria-label="Cluster radial map"
          >
            <rect x={0} y={0} width={SVG_SIZE} height={SVG_SIZE} fill="transparent" />

            {prepared?.rings.map((ring) => (
              <g key={ring.key}>
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={ring.outer}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={Math.max(1, ring.outer - ring.inner)}
                  strokeOpacity={0.7}
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={ring.inner}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={1}
                  strokeOpacity={0.9}
                />
              </g>
            ))}

            {prepared?.sectors.map((sector: RadialSector) => {
              const outerRing = prepared.rings[prepared.rings.length - 1];
              if (!outerRing) return null;

              const path = describeArc(
                CENTER,
                CENTER,
                0,
                outerRing.outer,
                sector.startAngleDeg,
                sector.endAngleDeg,
              );

              return (
                <path
                  key={sector.key}
                  d={path}
                  fill={getSectorFill(sector.index)}
                  fillOpacity={0.18}
                  stroke="#cbd5e1"
                  strokeOpacity={0.35}
                  strokeWidth={0.8}
                >
                  <title>
                    {`${sector.label} · ${sector.articleCount} articles`}
                  </title>
                </path>
              );
            })}

            <circle
              cx={CENTER}
              cy={CENTER}
              r={2.5}
              fill="#0f172a"
            />

            {prepared?.points.map((point) => {
              const { x, y } = resolvePointPosition(
                point,
                prepared.maxPointRadius,
                prepared.useCartesian,
              );

              return (
                <circle
                  key={`${point.articleId}-${point.articleIndex}`}
                  cx={x}
                  cy={y}
                  r={getPointRadius(point)}
                  fill={getPointColor(point)}
                  fillOpacity={0.9}
                  stroke="#ffffff"
                  strokeWidth={0.8}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint((current) =>
                    current?.articleId === point.articleId ? null : current,
                  )}
                >
                  <title>
                    {`Article ${point.articleId}
Ring ${point.ringIndex}
Sector ${point.sectorIndex}
Confidence ${formatNumber(point.membershipConfidence, 3)}
Distance ${formatNumber(point.distanceToCentroid, 3)}`}
                  </title>
                </circle>
              );
            })}
          </svg>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border bg-card/40 p-3">
            <div className="text-sm font-medium">Legend</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                <span>Core</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-violet-600" />
                <span>Edge</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-600" />
                <span>Outlier risk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-orange-600" />
                <span>Questionable</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-600" />
                <span>Outlier</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card/40 p-3">
            <div className="text-sm font-medium">Distribution</div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mean distance</span>
                <span>{formatNumber(radialMap.stats.distanceMean, 3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Median distance</span>
                <span>{formatNumber(radialMap.stats.distanceMedian, 3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Min distance</span>
                <span>{formatNumber(radialMap.stats.distanceMin, 3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max distance</span>
                <span>{formatNumber(radialMap.stats.distanceMax, 3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subclusters</span>
                <span>{radialMap.stats.subclusterCount}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card/40 p-3">
            <div className="text-sm font-medium">Hovered point</div>
            {hoveredPoint ? (
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Article</span>
                  <span>{hoveredPoint.articleId}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Subcluster</span>
                  <span>{hoveredPoint.subclusterLabel ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Confidence</span>
                  <span>{formatNumber(hoveredPoint.membershipConfidence, 3)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Distance</span>
                  <span>{formatNumber(hoveredPoint.distanceToCentroid, 3)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Outlier score</span>
                  <span>{formatNumber(hoveredPoint.outlierScore, 3)}</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Hover a point to inspect its membership and distance metrics.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}