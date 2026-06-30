import { useMemo, useState } from "react";
import type {
  ClusterRadialMap as ClusterRadialMapData,
  RadialPoint,
  RadialRing,
  RadialSector,
} from "@/api/clustering";

type Props = {
  radialMap: ClusterRadialMapData | null | undefined;
  title?: string;
};

const SVG_SIZE = 520;
const CENTER = SVG_SIZE / 2;
const OUTER_RADIUS = 210;

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatNumber(value: number | null | undefined, digits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : "—";
}

function polarToCartesian(radius: number, angleDeg: number) {
  const safeRadius = safeNumber(radius, 0);
  const safeAngle = safeNumber(angleDeg, 0);
  const angle = ((safeAngle - 90) * Math.PI) / 180;

  return {
    x: CENTER + safeRadius * Math.cos(angle),
    y: CENTER + safeRadius * Math.sin(angle),
  };
}

function describeArc(
  innerRadius: number,
  outerRadius: number,
  startAngleDeg: number,
  endAngleDeg: number,
) {
  const safeInner = Math.max(0, safeNumber(innerRadius, 0));
  const safeOuter = Math.max(safeInner, safeNumber(outerRadius, 0));
  const safeStart = safeNumber(startAngleDeg, 0);
  const safeEnd = safeNumber(endAngleDeg, 0);

  const startOuter = polarToCartesian(safeOuter, safeEnd);
  const endOuter = polarToCartesian(safeOuter, safeStart);
  const startInner = polarToCartesian(safeInner, safeStart);
  const endInner = polarToCartesian(safeInner, safeEnd);

  const delta = ((safeEnd - safeStart) % 360 + 360) % 360;
  const largeArcFlag = delta > 180 ? 1 : 0;

  if (safeInner <= 0) {
    return [
      `M ${CENTER} ${CENTER}`,
      `L ${startOuter.x} ${startOuter.y}`,
      `A ${safeOuter} ${safeOuter} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
      "Z",
    ].join(" ");
  }

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${safeOuter} ${safeOuter} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${safeInner} ${safeInner} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y}`,
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
  if (!rings.length) return [];

  const validRings = rings
    .map((ring) => ({
      ...ring,
      radiusInner: safeNumber(ring.radiusInner, 0),
      radiusOuter: safeNumber(ring.radiusOuter, 0),
    }))
    .filter((ring) => ring.radiusOuter >= 0 && ring.radiusOuter >= ring.radiusInner);

  if (!validRings.length) return [];

  const maxOuter = Math.max(1, ...validRings.map((ring) => ring.radiusOuter));

  return validRings.map((ring) => ({
    ...ring,
    inner: clamp((ring.radiusInner / maxOuter) * OUTER_RADIUS, 0, OUTER_RADIUS),
    outer: clamp((ring.radiusOuter / maxOuter) * OUTER_RADIUS, 0, OUTER_RADIUS),
  }));
}

function resolvePointPosition(
  point: RadialPoint,
  maxPointRadius: number,
  useCartesian: boolean,
) {
  if (useCartesian) {
    return {
      x: CENTER + safeNumber(point.x, 0) * OUTER_RADIUS,
      y: CENTER + safeNumber(point.y, 0) * OUTER_RADIUS,
    };
  }

  const normalizedRadius =
    maxPointRadius > 0
      ? clamp((safeNumber(point.radius, 0) / maxPointRadius) * OUTER_RADIUS, 0, OUTER_RADIUS)
      : 0;

  return polarToCartesian(normalizedRadius, safeNumber(point.angleDeg, 0));
}

export default function ClusterRadialMap({
  radialMap,
  title = "Cluster radial map",
}: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<RadialPoint | null>(null);

  const prepared = useMemo(() => {
    if (!radialMap) return null;

    const rings = normalizeRings(radialMap.rings ?? []);
    const sectors = (radialMap.sectors ?? []).filter(
      (sector) =>
        Number.isFinite(sector.startAngleDeg) &&
        Number.isFinite(sector.endAngleDeg),
    );

    const rawPoints = (radialMap.points ?? []).filter((point) => {
      const hasCartesian =
        Number.isFinite(point.x) && Number.isFinite(point.y);
      const hasPolar =
        Number.isFinite(point.radius) && Number.isFinite(point.angleDeg);
      return hasCartesian || hasPolar;
    });

    const maxPointRadius = Math.max(
      1,
      ...rawPoints.map((point) => safeNumber(point.radius, 0)),
    );

    const cartesianLooksValid =
      rawPoints.length > 0 &&
      rawPoints.every(
        (point) =>
          Number.isFinite(point.x) &&
          Number.isFinite(point.y) &&
          Math.abs(safeNumber(point.x, 0)) <= 1.25 &&
          Math.abs(safeNumber(point.y, 0)) <= 1.25,
      );

    const points = rawPoints
      .map((point) => {
        const pos = resolvePointPosition(point, maxPointRadius, cartesianLooksValid);
        return {
          point,
          x: pos.x,
          y: pos.y,
        };
      })
      .filter(
        (item) =>
          Number.isFinite(item.x) &&
          Number.isFinite(item.y) &&
          item.x >= -40 &&
          item.x <= SVG_SIZE + 40 &&
          item.y >= -40 &&
          item.y <= SVG_SIZE + 40,
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

  if (!prepared) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-4 py-6 text-sm text-muted-foreground">
        Radial map payload is present, but could not be prepared for rendering.
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
            <div className="text-sm font-medium">
              {radialMap.stats?.articleCount ?? 0}
            </div>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Rings</div>
            <div className="text-sm font-medium">{radialMap.ringCount ?? 0}</div>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Sectors</div>
            <div className="text-sm font-medium">{radialMap.sectorCount ?? 0}</div>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Subclusters</div>
            <div className="text-sm font-medium">
              {radialMap.stats?.subclusterCount ?? 0}
            </div>
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
            Ring mode {radialMap.ringMode ?? "—"} · sector mode{" "}
            {radialMap.sectorMode ?? "—"} · version {radialMap.version ?? "—"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <div className="rounded-md border bg-card px-3 py-2">
            Articles{" "}
            <span className="font-medium text-foreground">
              {radialMap.stats?.articleCount ?? 0}
            </span>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            Core{" "}
            <span className="font-medium text-foreground">
              {radialMap.stats?.coreCount ?? 0}
            </span>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            Edge{" "}
            <span className="font-medium text-foreground">
              {radialMap.stats?.edgeCount ?? 0}
            </span>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            Outliers{" "}
            <span className="font-medium text-foreground">
              {radialMap.stats?.outlierCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-dashed bg-card/40 px-3 py-2 text-xs text-muted-foreground">
        Rendered: {prepared.rings.length} rings · {prepared.sectors.length} sectors ·{" "}
        {prepared.points.length} visible points
      </div>

      {/* Главное: карта во всю ширину инспектора, без второго столбца */}
      <div className="space-y-4">
        <div className="rounded-xl border bg-card/40 p-3">
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className="mx-auto h-auto w-full max-w-[520px]"
            role="img"
            aria-label="Cluster radial map"
          >
            <rect x={0} y={0} width={SVG_SIZE} height={SVG_SIZE} fill="transparent" />

            {prepared.sectors.map((sector: RadialSector) => {
              const outerRing = prepared.rings[prepared.rings.length - 1];
              if (!outerRing) return null;

              const path = describeArc(
                0,
                outerRing.outer,
                safeNumber(sector.startAngleDeg, 0),
                safeNumber(sector.endAngleDeg, 0),
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
                  <title>{`${sector.label} · ${sector.articleCount} articles`}</title>
                </path>
              );
            })}

            {prepared.rings.map((ring) => {
              const radius = (ring.inner + ring.outer) / 2;
              const width = Math.max(1, ring.outer - ring.inner);

              if (!Number.isFinite(radius) || radius <= 0) return null;

              return (
                <circle
                  key={ring.key}
                  cx={CENTER}
                  cy={CENTER}
                  r={radius}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={width}
                  strokeOpacity={0.72}
                />
              );
            })}

            <circle cx={CENTER} cy={CENTER} r={2.5} fill="#0f172a" />

            {prepared.points.map(({ point, x, y }) => (
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
                onMouseLeave={() =>
                  setHoveredPoint((current) =>
                    current?.articleId === point.articleId ? null : current,
                  )
                }
              >
                <title>
                  {`Article ${point.articleId}
Ring ${point.ringIndex}
Sector ${point.sectorIndex}
Confidence ${formatNumber(
                    point.membershipConfidence,
                    3,
                  )}
Distance ${formatNumber(point.distanceToCentroid, 3)}`}
                </title>
              </circle>
            ))}
          </svg>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
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
                <span>{formatNumber(radialMap.stats?.distanceMean, 3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Median distance</span>
                <span>{formatNumber(radialMap.stats?.distanceMedian, 3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Min distance</span>
                <span>{formatNumber(radialMap.stats?.distanceMin, 3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max distance</span>
                <span>{formatNumber(radialMap.stats?.distanceMax, 3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subclusters</span>
                <span>{radialMap.stats?.subclusterCount ?? 0}</span>
              </div>
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
    </section>
  );
}