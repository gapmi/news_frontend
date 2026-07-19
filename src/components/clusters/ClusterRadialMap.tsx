import { useMemo, useState } from "react";
import type {
  ClusterRadialMap as ClusterRadialMapData,
  ArticlePreview,
  RadialPoint,
  RadialRing,
  RadialSector,
} from "@/api/clustering";


type RadialMapVariant =
  | "subcluster-rays"
  | "subcluster-segments"
  | "combined";


type Props = {
  radialMap: ClusterRadialMapData | null | undefined;
  articles?: ArticlePreview[] | null | undefined;
  title?: string;
  variant?: RadialMapVariant;
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


function formatPublishedAt(value: string | null | undefined) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;


  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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


// function getSubclusterColor(index: number) {
//   const palette = [
//     "#2563eb",
//     "#dc2626",
//     "#16a34a",
//     "#ca8a04",
//     "#7c3aed",
//     "#db2777",
//     "#ea580c",
//     "#0891b2",
//     "#4f46e5",
//     "#059669",
//     "#9333ea",
//     "#0f766e",
//   ];
//   return palette[Math.abs(index) % palette.length];
// }

function getSubclusterFillColor(index: number) {
  const hue = (Math.abs(index) * 137.508) % 360;
  return `hsl(${hue}, 65%, 84%)`;
}

function getSubclusterStrokeColor(index: number) {
  const hue = (Math.abs(index) * 137.508) % 360;
  return `hsl(${hue}, 55%, 58%)`;
}


function getPointStroke(point: RadialPoint) {
  if (point.isOutlier) return "#7f1d1d";
  if (point.isQuestionable) return "#9a3412";
  if (point.isOutlierRisk) return "#92400e";
  return "#ffffff";
}


function getPointFill(point: RadialPoint, variant: RadialMapVariant) {
  if (variant === "subcluster-rays") {
    return getSubclusterFillColor(point.sectorIndex);
  }


  if (variant === "subcluster-segments") {
    return point.isCore ? "#2563eb" : "#94a3b8";
  }


  return getSubclusterFillColor(point.sectorIndex);
}


function getPointStrokeByVariant(point: RadialPoint, variant: RadialMapVariant) {
  if (variant === "subcluster-segments") {
    return point.isCore ? "#ffffff" : "#cbd5e1";
  }


  if (variant === "combined") {
    return getPointStroke(point);
  }


  return getPointStroke(point);
}


function getSectorFillOpacity(variant: RadialMapVariant) {
  if (variant === "subcluster-segments") return 0.26;
  if (variant === "combined") return 0.18;
  return 0.12;
}


function getSectorStrokeOpacity(variant: RadialMapVariant) {
  if (variant === "subcluster-segments") return 0.65;
  if (variant === "combined") return 0.5;
  return 0.42;
}


function getSectorStrokeWidth(variant: RadialMapVariant) {
  if (variant === "subcluster-segments") return 1.5;
  if (variant === "combined") return 1.15;
  return 1.1;
}


function getPointFillOpacity(point: RadialPoint, variant: RadialMapVariant) {
  if (variant === "subcluster-segments") {
    if (point.isCore) return 0.92;
    if (point.isEdge) return 0.45;
    if (point.isOutlierRisk) return 0.3;
    return 0.4;
  }


  if (variant === "combined") {
    if (point.isCore) return 0.96;
    if (point.isEdge) return 0.82;
    if (point.isOutlierRisk) return 0.7;
    return 0.76;
  }


  return getPointOpacity(point);
}


function getPointStrokeWidthByVariant(point: RadialPoint, variant: RadialMapVariant) {
  if (variant === "subcluster-segments") {
    return point.isCore ? 0.9 : 0.5;
  }


  if (variant === "combined") {
    return getPointStrokeWidth(point);
  }


  return getPointStrokeWidth(point);
}


function getPointRadiusByVariant(point: RadialPoint, variant: RadialMapVariant) {
  if (variant === "subcluster-segments") {
    return point.isCore ? 2.8 : 1.9;
  }


  if (variant === "combined") {
    if (point.isOutlier || point.isQuestionable) return 4.2;
    if (point.isOutlierRisk) return 3.8;
    return 3;
  }


  return getPointRadius(point);
}



function getPointRadius(point: RadialPoint) {
  if (point.isOutlier) return 4.5;
  if (point.isQuestionable) return 4;
  if (point.isOutlierRisk) return 4;
  return 3.2;
}


function getPointOpacity(point: RadialPoint) {
  if (point.isOutlier) return 0.98;
  if (point.isQuestionable) return 0.92;
  if (point.isOutlierRisk) return 0.88;
  if (point.isEdge) return 0.84;
  if (point.isCore) return 0.92;
  return 0.8;
}


function getPointStrokeWidth(point: RadialPoint) {
  if (point.isOutlier || point.isQuestionable || point.isOutlierRisk) return 1;
  return 0.6;
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


function resolvePointPosition(point: RadialPoint, maxPointRadius: number) {
  const normalizedRadius =
    maxPointRadius > 0
      ? clamp((safeNumber(point.radius, 0) / maxPointRadius) * OUTER_RADIUS, 0, OUTER_RADIUS)
      : 0;


  return polarToCartesian(normalizedRadius, safeNumber(point.angleDeg, 0));
}


type HoverState = {
  point: RadialPoint;
  x: number;
  y: number;
};


export default function ClusterRadialMap({
  radialMap,
  articles,
  title = "Cluster radial map",
  variant = "subcluster-rays",
}: Props) {
  const [hovered, setHovered] = useState<HoverState | null>(null);


  const articlesById = useMemo(() => {
    const map = new Map<number, ArticlePreview>();
    for (const article of articles ?? []) {
      if (typeof article.id === "number") {
        map.set(article.id, article);
      }
    }
    return map;
  }, [articles]);


  const prepared = useMemo(() => {
    if (!radialMap) return null;


    const rings = normalizeRings(radialMap.rings ?? []);
    const sectors = (radialMap.sectors ?? []).filter(
      (sector) =>
        Number.isFinite(sector.startAngleDeg) &&
        Number.isFinite(sector.endAngleDeg),
    );


    const rawPoints = (radialMap.points ?? []).filter(
      (point) =>
        Number.isFinite(point.radius) && Number.isFinite(point.angleDeg),
    );


    const maxPointRadius = Math.max(
      1,
      ...rawPoints.map((point) => safeNumber(point.radius, 0)),
    );


    const points = rawPoints
      .map((point) => {
        const pos = resolvePointPosition(point, maxPointRadius);
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


  const hoveredArticle = hovered
    ? articlesById.get(hovered.point.articleId)
    : null;


  const hoveredArticleId =
    hovered?.point.articleId ?? "—";


    const hoveredTitle =
    hovered?.point.title ?? hoveredArticle?.title ?? `Article ${hovered?.point.articleId ?? "—"}`;


  const hoveredSource =
    hovered?.point.source ?? hoveredArticle?.source ?? "Unknown source";


  const hoveredPublished =
    hovered?.point.published ?? hoveredArticle?.published ?? null;


  const hoveredUrl =
    hovered?.point.url ?? hoveredArticle?.url ?? null;


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


      <div className="space-y-4">
        <div className="relative rounded-xl border bg-card/40 p-3">
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className="mx-auto h-auto w-full max-w-[520px]"
            role="img"
            aria-label="Cluster radial map"
            onMouseLeave={() => setHovered(null)}
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
      fill={getSubclusterFillColor(sector.index)}
      fillOpacity={getSectorFillOpacity(variant)}
      stroke={getSubclusterStrokeColor(sector.index)}
      strokeOpacity={getSectorStrokeOpacity(variant)}
      strokeWidth={getSectorStrokeWidth(variant)}
    />
  );
})}

{prepared.rings.map((ring) => {
  const radius = (ring.inner + ring.outer) / 2;

  if (!Number.isFinite(radius) || radius <= 0) return null;

  return (
    <circle
      key={ring.key}
      cx={CENTER}
      cy={CENTER}
      r={radius}
      fill="none"
      stroke="#94a3b8"
      strokeOpacity={0.42}
      strokeWidth={1}
    />
  );
})}


            <circle cx={CENTER} cy={CENTER} r={2.5} fill="#0f172a" />


            {prepared.points.map(({ point, x, y }) => (
              <circle
                key={`${point.articleId}-${point.articleIndex}`}
                cx={x}
                cy={y}
                r={getPointRadiusByVariant(point, variant)}
                fill={getPointFill(point, variant)}
                fillOpacity={getPointFillOpacity(point, variant)}
                stroke={getPointStrokeByVariant(point, variant)}
                strokeWidth={getPointStrokeWidthByVariant(point, variant)}
                className="cursor-pointer transition-opacity hover:opacity-100"
                onMouseEnter={() => setHovered({ point, x, y })}
                onMouseMove={() => setHovered({ point, x, y })}
              />
            ))}
          </svg>


          {hovered ? (
            <div
              className="pointer-events-none absolute z-20 max-w-[320px] rounded-lg border border-border/80 bg-background/95 px-3 py-3 shadow-lg backdrop-blur"
              style={{
                left: `min(calc(${(hovered.x / SVG_SIZE) * 100}% + 16px), calc(100% - 336px))`,
                top: `min(calc(${(hovered.y / SVG_SIZE) * 100}% + 16px), calc(100% - 132px))`,
              }}
            >
              <div className="line-clamp-3 text-sm font-medium leading-5 text-foreground">
                {hoveredArticleId}
              </div>
              
              <div className="line-clamp-3 text-sm font-medium leading-5 text-foreground">
                {hoveredTitle}
              </div>


              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{hoveredSource}</span>
                <span>{formatPublishedAt(hoveredPublished)}</span>
              </div>


              {hoveredUrl ? (
                <div className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
                  {hoveredUrl}
                </div>
              ) : null}


              <div className="mt-3 grid gap-1 text-[11px] text-muted-foreground">
                <div>
                  Ring {hovered.point.ringIndex} · Sector {hovered.point.sectorIndex}
                </div>
                <div>
                  Confidence {formatNumber(hovered.point.membershipConfidence, 3)} ·
                  Distance {formatNumber(hovered.point.distanceToCentroid, 3)}
                </div>
              </div>
            </div>
          ) : null}
        </div>


        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-card/40 p-3">
        <div className="rounded-xl border bg-card/40 p-3">
        <div className="text-sm font-medium">Legend</div>
        <div className="mt-3 space-y-2 text-sm">
            {prepared.sectors.slice(0, 8).map((sector) => (
            <div key={sector.key} className="flex items-center gap-2">
                <span
                className="h-3 w-3 rounded-full border"
                style={{ backgroundColor: getSubclusterFillColor(sector.index) }}
                />
                <span>{sector.label ?? sector.key}</span>
            </div>
            ))}
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
      </div>
    </section>
  );
}