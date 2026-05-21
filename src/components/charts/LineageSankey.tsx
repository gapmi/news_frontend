// src/components/charts/LineageSankey.tsx
import { useMemo } from "react";

type SankeyNode = {
  id: string;
  label: string;
  runId: number;
  clusterId: number;
  clusterLabel?: number;
  size: number;
  depth: number;
  meta?: {
    representativeArticleId?: number | null;
    nameShort?: string | null;
    nameTitle?: string | null;
    tags?: string[] | null;
  };
};

type SankeyLink = {
  id: string;
  edgeId: number;
  source: string;
  target: string;
  value: number;
  score: number;
  overlapRatio: number;
  overlapCount: number;
  similarity: number;
};

export type LineageSankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
  stats?: {
    nodeCount: number;
    linkCount: number;
    runCount: number;
    truncated?: boolean;
  };
};

type Props = {
  data: LineageSankeyData;
  selectedEdgeId?: number | null;
  onSelectEdge?: (edgeId: number) => void;
  maxLinks?: number;
};

type FlowNode = {
  id: string;
  clusterId: number;
  runId: number;
  label: string;
  shortLabel: string;
  total: number;
  count: number;
  side: "parent" | "child";
  y: number;
  h: number;
  size: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function truncate(value: string, max = 26) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export default function LineageSankey({
  data,
  selectedEdgeId = null,
  onSelectEdge,
  maxLinks = 14,
}: Props) {
  const topLinks = useMemo(() => {
    return [...data.links]
      .sort((a, b) => {
        if (b.overlapCount !== a.overlapCount) {
          return b.overlapCount - a.overlapCount;
        }
        return b.score - a.score;
      })
      .slice(0, maxLinks);
  }, [data.links, maxLinks]);

  const {
    parentNodes,
    childNodes,
    parentMap,
    childMap,
    maxOverlap,
    parentRunId,
    childRunId,
  } = useMemo(() => {
    const nodeById = new Map(data.nodes.map((node) => [node.id, node] as const));

    const parentAgg = new Map<string, { total: number; count: number }>();
    const childAgg = new Map<string, { total: number; count: number }>();

    for (const link of topLinks) {
      const parentCurrent = parentAgg.get(link.source) ?? { total: 0, count: 0 };
      parentCurrent.total += link.overlapCount;
      parentCurrent.count += 1;
      parentAgg.set(link.source, parentCurrent);

      const childCurrent = childAgg.get(link.target) ?? { total: 0, count: 0 };
      childCurrent.total += link.overlapCount;
      childCurrent.count += 1;
      childAgg.set(link.target, childCurrent);
    }

    const layout = (
      ids: string[],
      side: "parent" | "child",
    ): FlowNode[] => {
      const items = ids
        .map((id) => {
          const node = nodeById.get(id);
          const agg =
            side === "parent" ? parentAgg.get(id) : childAgg.get(id);

          if (!node || !agg) return null;

          return {
            id,
            clusterId: node.clusterId,
            runId: node.runId,
            label: node.label,
            shortLabel:
              node.meta?.nameShort?.trim() ||
              node.meta?.nameTitle?.trim() ||
              `C${node.clusterId}`,
            total: agg.total,
            count: agg.count,
            side,
            size: node.size,
          };
        })
        .filter(Boolean) as Array<Omit<FlowNode, "y" | "h">>;

      items.sort((a, b) => b.total - a.total);

      const top = 28;
      const gap = 14;
      const minH = 34;
      const maxH = 76;
      const maxTotal = Math.max(...items.map((item) => item.total), 1);

      let cursorY = top;

      return items.map((item) => {
        const h = clamp((item.total / maxTotal) * maxH, minH, maxH);
        const positioned: FlowNode = {
          ...item,
          y: cursorY,
          h,
        };
        cursorY += h + gap;
        return positioned;
      });
    };

    const parentIds = [...parentAgg.keys()];
    const childIds = [...childAgg.keys()];

    const parentNodes = layout(parentIds, "parent");
    const childNodes = layout(childIds, "child");

    return {
      parentNodes,
      childNodes,
      parentMap: new Map(parentNodes.map((node) => [node.id, node] as const)),
      childMap: new Map(childNodes.map((node) => [node.id, node] as const)),
      maxOverlap: Math.max(...topLinks.map((edge) => edge.overlapCount), 1),
      parentRunId: parentNodes[0]?.runId ?? null,
      childRunId: childNodes[0]?.runId ?? null,
    };
  }, [data.nodes, topLinks]);

  if (topLinks.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-sm text-muted-foreground">
        No Sankey data for this pair.
      </div>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-medium">Sankey</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pair {parentRunId ?? "—"} → {childRunId ?? "—"}, top links by overlap.
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 1100 560"
          className="h-[560px] w-full min-w-[900px]"
          role="img"
          aria-label={`Sankey for run ${parentRunId} to run ${childRunId}`}
        >
          <defs>
            <linearGradient id="sankeyGradient" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.55" />
            </linearGradient>
          </defs>

          <text x="110" y="24" fontSize="14" fill="currentColor" opacity="0.7">
            Parent run {parentRunId ?? "—"}
          </text>
          <text x="860" y="24" fontSize="14" fill="currentColor" opacity="0.7">
            Child run {childRunId ?? "—"}
          </text>

          {topLinks.map((edge) => {
            const parentNode = parentMap.get(edge.source);
            const childNode = childMap.get(edge.target);

            if (!parentNode || !childNode) return null;

            const startX = 270;
            const endX = 830;
            const startY = parentNode.y + parentNode.h / 2;
            const endY = childNode.y + childNode.h / 2;
            const curve = 180;
            const strokeWidth = clamp((edge.overlapCount / maxOverlap) * 22, 3, 22);
            const isSelected = selectedEdgeId === edge.edgeId;

            const d = `M ${startX} ${startY}
              C ${startX + curve} ${startY},
                ${endX - curve} ${endY},
                ${endX} ${endY}`;

            return (
              <path
                key={edge.edgeId}
                d={d}
                fill="none"
                stroke="url(#sankeyGradient)"
                strokeWidth={strokeWidth}
                strokeOpacity={isSelected ? 0.96 : 0.4}
                strokeLinecap="round"
                className="cursor-pointer transition-opacity"
                onClick={() => onSelectEdge?.(edge.edgeId)}
              >
                <title>
                  {`Edge ${edge.edgeId}: C${parentNode.clusterId} → C${childNode.clusterId}
overlap ${edge.overlapCount}
score ${formatNumber(edge.score, 3)}
similarity ${formatNumber(edge.similarity, 3)}`}
                </title>
              </path>
            );
          })}

          {parentNodes.map((node) => (
            <g key={node.id}>
              <rect
                x="70"
                y={node.y}
                width="200"
                height={node.h}
                rx="10"
                fill="#dbeafe"
                stroke="#93c5fd"
              />
              <text
                x="84"
                y={node.y + 18}
                fontSize="13"
                fontWeight="600"
                fill="#1e3a8a"
              >
                {truncate(node.shortLabel, 26)}
              </text>
              <text x="84" y={node.y + 36} fontSize="11" fill="#1e40af">
                {`C${node.clusterId} · size ${node.size}`}
              </text>
              <text x="84" y={node.y + 52} fontSize="11" fill="#1e40af">
                {`overlap ${node.total} · edges ${node.count}`}
              </text>
            </g>
          ))}

          {childNodes.map((node) => (
            <g key={node.id}>
              <rect
                x="830"
                y={node.y}
                width="200"
                height={node.h}
                rx="10"
                fill="#ede9fe"
                stroke="#c4b5fd"
              />
              <text
                x="844"
                y={node.y + 18}
                fontSize="13"
                fontWeight="600"
                fill="#5b21b6"
              >
                {truncate(node.shortLabel, 26)}
              </text>
              <text x="844" y={node.y + 36} fontSize="11" fill="#6d28d9">
                {`C${node.clusterId} · size ${node.size}`}
              </text>
              <text x="844" y={node.y + 52} fontSize="11" fill="#6d28d9">
                {`overlap ${node.total} · edges ${node.count}`}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Thicker links mean more overlapping articles. Click a link to sync with Euler detail.
      </div>
    </section>
  );
}