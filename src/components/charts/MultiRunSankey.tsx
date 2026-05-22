import { useMemo } from "react";
import type { SankeyLink, SankeyNode, SankeyResponse } from "@/api/clustering";

type Props = {
  data: SankeyResponse;
  selectedEdgeId?: number | null;
  onSelectEdge?: (edgeId: number) => void;
};

type LayoutNode = SankeyNode & {
  x: number;
  y: number;
  width: number;
  height: number;
  columnIndex: number;
  inbound: number;
  outbound: number;
  totalFlow: number;
};

type LayoutLink = SankeyLink & {
  sourceNode: LayoutNode;
  targetNode: LayoutNode;
  strokeWidth: number;
  path: string;
  edgeId: number | null;
};

const SVG_WIDTH = 1500;
const SVG_HEIGHT = 860;

const PADDING_TOP = 110;
const PADDING_BOTTOM = 72;
const PADDING_LEFT = 96;
const PADDING_RIGHT = 96;

const COLUMN_NODE_WIDTH = 150;
const COLUMN_GAP_MIN = 130;

const NODE_GAP = 16;
const MIN_NODE_HEIGHT = 24;
const MAX_NODE_HEIGHT = 84;

const MIN_STROKE = 2;
const MAX_STROKE = 18;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function getNodeLabel(node: SankeyNode) {
  if (node.meta?.nameShort && node.meta.nameShort.trim().length > 0) {
    return node.meta.nameShort;
  }

  if (node.label && node.label.trim().length > 0) {
    return node.label;
  }

  return `C${node.clusterId}`;
}

function ellipsize(value: string, max = 26) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function getColumnX(columnIndex: number, columnCount: number) {
  const usableWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT - COLUMN_NODE_WIDTH;
  const computedGap =
    columnCount > 1 ? usableWidth / (columnCount - 1) : 0;
  const gap = Math.max(COLUMN_GAP_MIN, computedGap);

  return PADDING_LEFT + columnIndex * gap;
}

function buildLinkPath(sourceNode: LayoutNode, targetNode: LayoutNode) {
  const x1 = sourceNode.x + sourceNode.width;
  const y1 = sourceNode.y + sourceNode.height / 2;
  const x2 = targetNode.x;
  const y2 = targetNode.y + targetNode.height / 2;
  const dx = x2 - x1;
  const curve = Math.max(60, dx * 0.42);

  return `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;
}

function getNumericEdgeId(link: SankeyLink): number | null {
  const raw = (link as { edgeId?: number }).edgeId;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  return null;
}

export default function MultiRunSankey({
  data,
  selectedEdgeId = null,
  onSelectEdge,
}: Props) {
  const {
    columns,
    layoutNodes,
    layoutLinks,
    maxStrokeValue,
    minRunId,
    maxRunId,
  } = useMemo(() => {
    const nodes = data.nodes ?? [];
    const links = data.links ?? [];

    const grouped = new Map<number, SankeyNode[]>();
    for (const node of nodes) {
      const current = grouped.get(node.depth) ?? [];
      current.push(node);
      grouped.set(node.depth, current);
    }

    const sortedDepths = [...grouped.keys()].sort((a, b) => a - b);

    const runIds = [...new Set(nodes.map((node) => node.runId))].sort((a, b) => a - b);
    const minRunId = runIds[0] ?? null;
    const maxRunId = runIds[runIds.length - 1] ?? null;

    const inboundMap = new Map<string, number>();
    const outboundMap = new Map<string, number>();

    for (const link of links) {
      inboundMap.set(link.target, (inboundMap.get(link.target) ?? 0) + link.value);
      outboundMap.set(link.source, (outboundMap.get(link.source) ?? 0) + link.value);
    }

    const columns = sortedDepths.map((depth, columnIndex) => {
      const columnNodes = [...(grouped.get(depth) ?? [])]
        .map((node) => {
          const inbound = inboundMap.get(node.id) ?? 0;
          const outbound = outboundMap.get(node.id) ?? 0;
          const totalFlow = Math.max(inbound, outbound, node.size ?? 0);

          return {
            ...node,
            inbound,
            outbound,
            totalFlow,
            columnIndex,
          };
        })
        .sort((a, b) => {
          if (b.totalFlow !== a.totalFlow) return b.totalFlow - a.totalFlow;
          if (b.size !== a.size) return b.size - a.size;
          return a.clusterId - b.clusterId;
        });

      return {
        depth,
        columnIndex,
        nodes: columnNodes,
      };
    });

    const allFlowValues = columns.flatMap((column) =>
      column.nodes.map((node) => node.totalFlow || 1),
    );

    const maxNodeFlow = Math.max(...allFlowValues, 1);

    const layoutNodes: LayoutNode[] = [];

    for (const column of columns) {
      const x = getColumnX(column.columnIndex, columns.length);

      const measuredHeights = column.nodes.map((node) =>
        clamp(
          (node.totalFlow / maxNodeFlow) * MAX_NODE_HEIGHT,
          MIN_NODE_HEIGHT,
          MAX_NODE_HEIGHT,
        ),
      );

      const totalColumnHeight =
        measuredHeights.reduce((sum, height) => sum + height, 0) +
        Math.max(0, column.nodes.length - 1) * NODE_GAP;

      const availableHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
      const topOffset = PADDING_TOP + Math.max(0, (availableHeight - totalColumnHeight) / 2);

      let currentY = topOffset;

      for (let index = 0; index < column.nodes.length; index += 1) {
        const node = column.nodes[index];
        const height = measuredHeights[index];

        layoutNodes.push({
          ...node,
          x,
          y: currentY,
          width: COLUMN_NODE_WIDTH,
          height,
        });

        currentY += height + NODE_GAP;
      }
    }

    const layoutNodeMap = new Map<string, LayoutNode>();
    for (const node of layoutNodes) {
      layoutNodeMap.set(node.id, node);
    }

    const maxStrokeValue = Math.max(...links.map((link) => link.value), 1);

    const layoutLinks: LayoutLink[] = links
      .map((link) => {
        const sourceNode = layoutNodeMap.get(link.source);
        const targetNode = layoutNodeMap.get(link.target);

        if (!sourceNode || !targetNode) {
          return null;
        }

        const strokeWidth = clamp(
          (link.value / maxStrokeValue) * MAX_STROKE,
          MIN_STROKE,
          MAX_STROKE,
        );

        return {
          ...link,
          sourceNode,
          targetNode,
          strokeWidth,
          path: buildLinkPath(sourceNode, targetNode),
          edgeId: getNumericEdgeId(link),
        };
      })
      .filter(Boolean) as LayoutLink[];

    return {
      columns,
      layoutNodes,
      layoutLinks,
      maxStrokeValue,
      minRunId,
      maxRunId,
    };
  }, [data]);

  if (!data.nodes.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        No Sankey data available for this run window.
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">Multi-run lineage</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Runs {minRunId ?? "—"} → {maxRunId ?? "—"}. Width of bands encodes overlap.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="rounded-md border bg-background px-3 py-2">
            Nodes: <span className="font-medium text-foreground">{data.stats.nodeCount}</span>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            Links: <span className="font-medium text-foreground">{data.stats.linkCount}</span>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            Runs: <span className="font-medium text-foreground">{data.stats.runCount}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-background">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="h-[860px] w-full min-w-[1320px]"
          role="img"
          aria-label={`Multi-run lineage from run ${minRunId ?? "unknown"} to run ${maxRunId ?? "unknown"}`}
        >
          <defs>
            <linearGradient id="sankey-band-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.52" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.36" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.52" />
            </linearGradient>

            <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="1"
                stdDeviation="1.8"
                floodColor="#0f172a"
                floodOpacity="0.08"
              />
            </filter>
          </defs>

          {columns.map((column) => {
            const runId = column.nodes[0]?.runId;

            return (
              <g key={`col-${column.depth}`}>
                <text
                  x={getColumnX(column.columnIndex, columns.length) + COLUMN_NODE_WIDTH / 2}
                  y={52}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight="600"
                  fill="#52525b"
                >
                  Run {runId ?? "—"}
                </text>
              </g>
            );
          })}

          {layoutLinks.map((link) => {
            const isSelected =
              selectedEdgeId !== null &&
              link.edgeId !== null &&
              selectedEdgeId === link.edgeId;

            return (
              <path
                key={link.id}
                d={link.path}
                fill="none"
                stroke="url(#sankey-band-gradient)"
                strokeWidth={link.strokeWidth}
                strokeOpacity={isSelected ? 0.95 : 0.48}
                strokeLinecap="round"
                className="cursor-pointer transition-opacity"
                onClick={() => {
                  if (link.edgeId !== null) {
                    onSelectEdge?.(link.edgeId);
                  }
                }}
              >
                <title>
                  {`${getNodeLabel(link.sourceNode)} → ${getNodeLabel(link.targetNode)}
Overlap: ${link.value}
Score: ${formatNumber(link.score, 3)}
Similarity: ${formatNumber(link.similarity, 3)}`}
                </title>
              </path>
            );
          })}

          {layoutNodes.map((node) => {
            const label = getNodeLabel(node);
            const shortLabel = ellipsize(label, 28);
            const hasSelectedConnection =
              selectedEdgeId !== null &&
              layoutLinks.some(
                (link) =>
                  link.edgeId === selectedEdgeId &&
                  (link.sourceNode.id === node.id || link.targetNode.id === node.id),
              );

            return (
              <g key={node.id} filter="url(#node-shadow)">
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={12}
                  fill={hasSelectedConnection ? "#e2e8f0" : "#f3f4f6"}
                  stroke={hasSelectedConnection ? "#94a3b8" : "#d1d5db"}
                />

                <text
                  x={node.x + 12}
                  y={node.y + 22}
                  fontSize="12.5"
                  fontWeight="600"
                  fill="#111827"
                >
                  {shortLabel}
                </text>

                {node.height >= 44 && (
                  <>
                    <text
                      x={node.x + 12}
                      y={node.y + 40}
                      fontSize="10.5"
                      fill="#475569"
                    >
                      {`C${node.clusterId} · size ${node.size}`}
                    </text>
                    <text
                      x={node.x + 12}
                      y={node.y + 55}
                      fontSize="10.5"
                      fill="#64748b"
                    >
                      {`flow ${formatNumber(node.totalFlow, 0)}`}
                    </text>
                  </>
                )}

                <title>
                  {`${label}
Run ${node.runId}
Cluster ${node.clusterId}
Size ${node.size}
Inbound ${formatNumber(node.inbound, 0)}
Outbound ${formatNumber(node.outbound, 0)}`}
                </title>
              </g>
            );
          })}

          <text
            x={PADDING_LEFT}
            y={SVG_HEIGHT - 24}
            fontSize="12"
            fill="#6b7280"
          >
            Bands connect clusters across runs. Click a band to sync with Euler detail or the lineage table.
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <div className="rounded-md border bg-background px-3 py-2">
          Thickest band: <span className="font-medium text-foreground">{formatNumber(maxStrokeValue, 0)}</span>
        </div>
        <div className="rounded-md border bg-background px-3 py-2">
          Selected edge: <span className="font-medium text-foreground">{selectedEdgeId ?? "—"}</span>
        </div>
      </div>
    </section>
  );
}