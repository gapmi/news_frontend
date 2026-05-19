import { useMemo } from "react";
import type { LineageEdge } from "@/api/clustering";

type Props = {
  edges: LineageEdge[];
  parentRunId: number | null;
  childRunId: number | null;
  selectedEdgeId?: number | null;
  onSelectEdge?: (edgeId: number) => void;
};

type FlowNode = {
  id: string;
  clusterId: number;
  side: "parent" | "child";
  total: number;
  count: number;
  y: number;
  h: number;
};

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function LineageFlow({
  edges,
  parentRunId,
  childRunId,
  selectedEdgeId = null,
  onSelectEdge,
}: Props) {
  const topEdges = useMemo(() => {
    return [...edges]
      .sort((a, b) => {
        if (b.articleOverlapCount !== a.articleOverlapCount) {
          return b.articleOverlapCount - a.articleOverlapCount;
        }
        return b.score - a.score;
      })
      .slice(0, 14);
  }, [edges]);

  const {
    parentNodes,
    childNodes,
    parentMap,
    childMap,
    maxOverlap,
  } = useMemo(() => {
    const parentAgg = new Map<number, { total: number; count: number }>();
    const childAgg = new Map<number, { total: number; count: number }>();

    for (const edge of topEdges) {
      const parentCurrent = parentAgg.get(edge.parentClusterId) ?? { total: 0, count: 0 };
      parentCurrent.total += edge.articleOverlapCount;
      parentCurrent.count += 1;
      parentAgg.set(edge.parentClusterId, parentCurrent);

      const childCurrent = childAgg.get(edge.childClusterId) ?? { total: 0, count: 0 };
      childCurrent.total += edge.articleOverlapCount;
      childCurrent.count += 1;
      childAgg.set(edge.childClusterId, childCurrent);
    }

    const parentSorted = [...parentAgg.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([clusterId, value]) => ({ clusterId, ...value }));

    const childSorted = [...childAgg.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([clusterId, value]) => ({ clusterId, ...value }));

    const layout = (
      items: Array<{ clusterId: number; total: number; count: number }>,
      side: "parent" | "child",
    ) => {
      const top = 28;
      const gap = 14;
      const minH = 34;
      const maxH = 74;
      const maxTotal = Math.max(...items.map((item) => item.total), 1);

      return items.map((item, index) => {
        const h = clamp((item.total / maxTotal) * maxH, minH, maxH);
        const y =
          top +
          items
            .slice(0, index)
            .reduce((sum, current) => {
              const currentH = clamp((current.total / maxTotal) * maxH, minH, maxH);
              return sum + currentH + gap;
            }, 0);

        return {
          id: `${side}-${item.clusterId}`,
          clusterId: item.clusterId,
          side,
          total: item.total,
          count: item.count,
          y,
          h,
        } satisfies FlowNode;
      });
    };

    const parentNodes = layout(parentSorted, "parent");
    const childNodes = layout(childSorted, "child");

    const parentMap = new Map(parentNodes.map((node) => [node.clusterId, node]));
    const childMap = new Map(childNodes.map((node) => [node.clusterId, node]));

    return {
      parentNodes,
      childNodes,
      parentMap,
      childMap,
      maxOverlap: Math.max(...topEdges.map((edge) => edge.articleOverlapCount), 1),
    };
  }, [topEdges]);

  if (!parentRunId || !childRunId) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-lg font-medium">Cluster flow</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pair {parentRunId} → {childRunId}, top lineage links by overlap.
          </p>
        </div>

        {topEdges.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-sm text-muted-foreground">
            No flow data for this pair.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <svg
              viewBox="0 0 1100 560"
              className="h-[560px] w-full min-w-[900px]"
              role="img"
              aria-label={`Cluster flow for run ${parentRunId} to run ${childRunId}`}
            >
              <defs>
                <linearGradient id="flowGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.55" />
                </linearGradient>
              </defs>

              <text x="110" y="24" fontSize="14" fill="currentColor" opacity="0.7">
                Parent run {parentRunId}
              </text>
              <text x="860" y="24" fontSize="14" fill="currentColor" opacity="0.7">
                Child run {childRunId}
              </text>

              {topEdges.map((edge) => {
                const parentNode = parentMap.get(edge.parentClusterId);
                const childNode = childMap.get(edge.childClusterId);

                if (!parentNode || !childNode) {
                  return null;
                }

                const startX = 250;
                const endX = 850;
                const startY = parentNode.y + parentNode.h / 2;
                const endY = childNode.y + childNode.h / 2;
                const curve = 220;
                const strokeWidth = clamp(
                  (edge.articleOverlapCount / maxOverlap) * 18,
                  2,
                  18,
                );
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
                    stroke="url(#flowGradient)"
                    strokeWidth={strokeWidth}
                    strokeOpacity={isSelected ? 0.95 : 0.42}
                    strokeLinecap="round"
                    className="cursor-pointer transition-opacity"
                    onClick={() => onSelectEdge?.(edge.edgeId)}
                  >
                    <title>
                      {`Edge #${edge.edgeId}: P${edge.parentClusterId} → C${edge.childClusterId} · overlap ${edge.articleOverlapCount} · score ${formatNumber(edge.score, 3)} · similarity ${formatNumber(edge.centroidSimilarity, 3)}`}
                    </title>
                  </path>
                );
              })}

              {parentNodes.map((node) => (
                <g key={node.id}>
                  <rect
                    x={80}
                    y={node.y}
                    width={170}
                    height={node.h}
                    rx={10}
                    fill="#dbeafe"
                    stroke="#93c5fd"
                  />
                  <text x={94} y={node.y + 18} fontSize="13" fontWeight="600" fill="#1e3a8a">
                    {`P${node.clusterId}`}
                  </text>
                  <text x={94} y={node.y + 36} fontSize="11" fill="#1e40af">
                    {`overlap ${node.total} · edges ${node.count}`}
                  </text>
                </g>
              ))}

              {childNodes.map((node) => (
                <g key={node.id}>
                  <rect
                    x={850}
                    y={node.y}
                    width={170}
                    height={node.h}
                    rx={10}
                    fill="#ede9fe"
                    stroke="#c4b5fd"
                  />
                  <text x={864} y={node.y + 18} fontSize="13" fontWeight="600" fill="#5b21b6">
                    {`C${node.clusterId}`}
                  </text>
                  <text x={864} y={node.y + 36} fontSize="11" fill="#6d28d9">
                    {`overlap ${node.total} · edges ${node.count}`}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}

        <div className="mt-3 text-xs text-muted-foreground">
          Thicker links mean more overlapping articles. Click a link to open Euler detail.
        </div>
      </div>
    </section>
  );
}