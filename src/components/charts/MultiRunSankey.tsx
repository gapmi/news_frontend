import { useMemo } from "react";
import type { SankeyLink, SankeyNode, SankeyResponse } from "@/api/clustering";

type Props = {
  data: SankeyResponse;
  selectedEdgeId?: number | null;
  selectedRunId?: number | null;
  onSelectEdge?: (edgeId: number) => void;
};

type PreparedNode = SankeyNode & {
  inbound: number;
  outbound: number;
  totalFlow: number;
  isOther?: boolean;
};

type LayoutNode = PreparedNode & {
  x: number;
  y: number;
  width: number;
  height: number;
  columnIndex: number;
};

type LayoutLink = {
  id: string;
  source: string;
  target: string;
  value: number;
  score: number;
  similarity: number;
  edgeId: number | null;
  sourceNode: LayoutNode;
  targetNode: LayoutNode;
  strokeWidth: number;
  path: string;
  isSynthetic?: boolean;
};

const SVG_HEIGHT = 760;
const PADDING_TOP = 84;
const PADDING_BOTTOM = 52;
const PADDING_LEFT = 72;
const PADDING_RIGHT = 72;
const COLUMN_NODE_WIDTH = 136;
const COLUMN_GAP = 220;
const NODE_GAP = 14;
const MIN_NODE_HEIGHT = 24;
const MAX_NODE_HEIGHT = 88;
const MIN_STROKE = 2;
const MAX_STROKE = 18;
const MAX_NODES_PER_COLUMN = 8;

const RUN_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#0f766e",
  "#ea580c",
  "#dc2626",
  "#0891b2",
  "#65a30d",
  "#c026d3",
];

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
  return `Cluster ${node.clusterId}`;
}

function ellipsize(value: string, max = 20) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function getColumnX(columnIndex: number) {
  return PADDING_LEFT + columnIndex * (COLUMN_NODE_WIDTH + COLUMN_GAP);
}

function buildLinkPath(sourceNode: LayoutNode, targetNode: LayoutNode) {
  const x1 = sourceNode.x + sourceNode.width;
  const y1 = sourceNode.y + sourceNode.height / 2;
  const x2 = targetNode.x;
  const y2 = targetNode.y + targetNode.height / 2;
  const dx = x2 - x1;
  const curve = Math.max(40, dx * 0.4);

  return `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;
}

function getNumericEdgeId(link: SankeyLink): number | null {
  const raw = (link as { edgeId?: number }).edgeId;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return null;
}

function getRunColor(runId: number, runIds: number[]) {
  const index = runIds.indexOf(runId);
  return RUN_COLORS[index >= 0 ? index % RUN_COLORS.length : 0];
}

function getLinkColor(
  link: LayoutLink,
  selectedRunId: number | null | undefined,
  runIds: number[],
) {
  const sourceRunId = link.sourceNode.runId;
  const targetRunId = link.targetNode.runId;

  if (selectedRunId == null) {
    return getRunColor(sourceRunId, runIds);
  }

  if (sourceRunId === selectedRunId) {
    return "#2563eb";
  }

  if (targetRunId === selectedRunId) {
    return "#7c3aed";
  }

  const distanceToSelected = Math.min(
    Math.abs(sourceRunId - selectedRunId),
    Math.abs(targetRunId - selectedRunId),
  );

  if (distanceToSelected === 1) {
    return getRunColor(sourceRunId, runIds);
  }

  return "#cbd5e1";
}

function getLinkOpacity(link: LayoutLink, selectedRunId: number | null | undefined) {
  if (selectedRunId == null) return 0.58;

  const touchesSelectedRun =
    link.sourceNode.runId === selectedRunId || link.targetNode.runId === selectedRunId;

  if (touchesSelectedRun) return 0.92;

  const isAdjacent =
    Math.abs(link.sourceNode.runId - selectedRunId) <= 1 ||
    Math.abs(link.targetNode.runId - selectedRunId) <= 1;

  if (isAdjacent) return 0.42;

  return 0.18;
}

export default function MultiRunSankey({
  data,
  selectedEdgeId = null,
  selectedRunId = null,
  onSelectEdge,
}: Props) {
  const {
    columns,
    layoutNodes,
    layoutLinks,
    maxStrokeValue,
    minRunId,
    maxRunId,
    runIds,
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

    const visibleNodeIdMap = new Map<number, Set<string>>();
    const hiddenNodeIdMap = new Map<number, Set<string>>();

    const preparedColumns: Array<{
      depth: number;
      columnIndex: number;
      runId: number | null;
      nodes: PreparedNode[];
    }> = [];

    for (const [columnIndex, depth] of sortedDepths.entries()) {
      const sourceNodes = grouped.get(depth) ?? [];

      const prepared: PreparedNode[] = sourceNodes
        .map((node) => {
          const inbound = inboundMap.get(node.id) ?? 0;
          const outbound = outboundMap.get(node.id) ?? 0;
          const totalFlow = Math.max(inbound, outbound, node.size ?? 0);

          return {
            ...node,
            inbound,
            outbound,
            totalFlow,
          };
        })
        .sort((a, b) => {
          if (b.totalFlow !== a.totalFlow) return b.totalFlow - a.totalFlow;
          if (b.size !== a.size) return b.size - a.size;
          return a.clusterId - b.clusterId;
        });

      const visible: PreparedNode[] = prepared.slice(0, MAX_NODES_PER_COLUMN);
      const hidden: PreparedNode[] = prepared.slice(MAX_NODES_PER_COLUMN);

      const visibleIds = new Set(visible.map((node) => node.id));
      const hiddenIds = new Set(hidden.map((node) => node.id));

      visibleNodeIdMap.set(depth, visibleIds);
      hiddenNodeIdMap.set(depth, hiddenIds);

      if (hidden.length > 0) {
        const otherNode: PreparedNode = {
          id: `other-${depth}`,
          label: "Other",
          runId: hidden[0].runId,
          clusterId: -1,
          clusterLabel: -1,
          size: hidden.reduce((sum, node) => sum + node.size, 0),
          depth,
          meta: {
            nameShort: `Other (${hidden.length})`,
          },
          inbound: hidden.reduce((sum, node) => sum + node.inbound, 0),
          outbound: hidden.reduce((sum, node) => sum + node.outbound, 0),
          totalFlow: hidden.reduce((sum, node) => sum + node.totalFlow, 0),
          isOther: true,
        };

        visible.push(otherNode);
      }

      preparedColumns.push({
        depth,
        columnIndex,
        runId: prepared[0]?.runId ?? null,
        nodes: visible,
      });
    }

    const remappedLinksMap = new Map<
      string,
      Omit<LayoutLink, "sourceNode" | "targetNode" | "strokeWidth" | "path">
    >();

    function mapNodeId(originalNodeId: string, depth: number) {
      const visibleIds = visibleNodeIdMap.get(depth) ?? new Set<string>();
      const hiddenIds = hiddenNodeIdMap.get(depth) ?? new Set<string>();

      if (visibleIds.has(originalNodeId)) return originalNodeId;
      if (hiddenIds.has(originalNodeId)) return `other-${depth}`;
      return originalNodeId;
    }

    const nodeById = new Map(nodes.map((node) => [node.id, node] as const));

    for (const link of links) {
      const sourceNode = nodeById.get(link.source);
      const targetNode = nodeById.get(link.target);

      if (!sourceNode || !targetNode) continue;

      const mappedSource = mapNodeId(link.source, sourceNode.depth);
      const mappedTarget = mapNodeId(link.target, targetNode.depth);
      const aggregateKey = `${mappedSource}-${mappedTarget}`;

      const existing = remappedLinksMap.get(aggregateKey);
      if (existing) {
        existing.value += link.value;
        existing.score = Math.max(existing.score, link.score);
        existing.similarity = Math.max(existing.similarity, link.similarity);
        if (existing.edgeId === null) {
          existing.edgeId = getNumericEdgeId(link);
        }
        existing.isSynthetic =
          Boolean(existing.isSynthetic) ||
          mappedSource.startsWith("other-") ||
          mappedTarget.startsWith("other-");
      } else {
        remappedLinksMap.set(aggregateKey, {
          id: aggregateKey,
          source: mappedSource,
          target: mappedTarget,
          value: link.value,
          score: link.score,
          similarity: link.similarity,
          edgeId: getNumericEdgeId(link),
          isSynthetic:
            mappedSource.startsWith("other-") || mappedTarget.startsWith("other-"),
        });
      }
    }

    const allPreparedNodes = preparedColumns.flatMap((column) => column.nodes);
    const maxNodeFlow = Math.max(...allPreparedNodes.map((node) => node.totalFlow), 1);

    const layoutNodes: LayoutNode[] = [];
    for (const column of preparedColumns) {
      const x = getColumnX(column.columnIndex);

      const heights = column.nodes.map((node) =>
        clamp((node.totalFlow / maxNodeFlow) * MAX_NODE_HEIGHT, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT),
      );

      const totalHeight =
        heights.reduce((sum, height) => sum + height, 0) +
        Math.max(0, column.nodes.length - 1) * NODE_GAP;

      const availableHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
      let currentY = PADDING_TOP + Math.max(0, (availableHeight - totalHeight) / 2);

      for (let i = 0; i < column.nodes.length; i += 1) {
        const node = column.nodes[i];
        const height = heights[i];

        layoutNodes.push({
          ...node,
          x,
          y: currentY,
          width: COLUMN_NODE_WIDTH,
          height,
          columnIndex: column.columnIndex,
        });

        currentY += height + NODE_GAP;
      }
    }

    const layoutNodeMap = new Map<string, LayoutNode>();
    for (const node of layoutNodes) {
      layoutNodeMap.set(node.id, node);
    }

    const remappedLinks = [...remappedLinksMap.values()].filter((link) => {
      return layoutNodeMap.has(link.source) && layoutNodeMap.has(link.target);
    });

    const maxStrokeValue = Math.max(...remappedLinks.map((link) => link.value), 1);

    const layoutLinks: LayoutLink[] = remappedLinks.map((link) => {
      const sourceNode = layoutNodeMap.get(link.source)!;
      const targetNode = layoutNodeMap.get(link.target)!;

      return {
        ...link,
        sourceNode,
        targetNode,
        strokeWidth: clamp(
          (link.value / maxStrokeValue) * MAX_STROKE,
          MIN_STROKE,
          MAX_STROKE,
        ),
        path: buildLinkPath(sourceNode, targetNode),
      };
    });

    return {
      columns: preparedColumns,
      layoutNodes,
      layoutLinks,
      maxStrokeValue,
      minRunId,
      maxRunId,
      runIds,
    };
  }, [data]);

  if (!data.nodes.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        No Sankey data available for this run window.
      </div>
    );
  }

  const svgWidth =
    PADDING_LEFT +
    PADDING_RIGHT +
    columns.length * COLUMN_NODE_WIDTH +
    Math.max(0, columns.length - 1) * COLUMN_GAP;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">Multi-run lineage</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Runs {minRunId ?? "—"} → {maxRunId ?? "—"}. Showing top{" "}
            {MAX_NODES_PER_COLUMN} nodes per run plus aggregated remainder.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="rounded-md border bg-background px-3 py-2">
            Nodes <span className="font-medium text-foreground">{layoutNodes.length}</span>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            Links <span className="font-medium text-foreground">{layoutLinks.length}</span>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            Runs <span className="font-medium text-foreground">{data.stats.runCount}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-background">
        <svg
          viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`}
          className="h-[760px]"
          style={{ width: `${svgWidth}px`, minWidth: `${svgWidth}px` }}
        >
          {columns.map((column) => (
            <g key={`col-${column.depth}`}>
              <text
                x={getColumnX(column.columnIndex) + COLUMN_NODE_WIDTH / 2}
                y={42}
                textAnchor="middle"
                fontSize={14}
                fontWeight={600}
                fill="#52525b"
              >
                Run {column.runId ?? "—"}
              </text>
            </g>
          ))}

          {layoutLinks.map((link) => {
            const isSelected =
              selectedEdgeId !== null &&
              link.edgeId !== null &&
              selectedEdgeId === link.edgeId;

            const stroke = getLinkColor(link, selectedRunId, runIds);
            const strokeOpacity = isSelected
              ? 0.98
              : getLinkOpacity(link, selectedRunId);

            return (
              <path
                key={link.id}
                d={link.path}
                fill="none"
                stroke={stroke}
                strokeWidth={link.strokeWidth}
                strokeOpacity={strokeOpacity}
                strokeLinecap="round"
                className={link.edgeId !== null ? "cursor-pointer" : undefined}
                onClick={() => {
                  if (link.edgeId !== null) {
                    onSelectEdge?.(link.edgeId);
                  }
                }}
              >
                <title>
                  {`${link.sourceNode.label ?? link.sourceNode.id} → ${
                    link.targetNode.label ?? link.targetNode.id
                  } | overlap ${link.value} | score ${formatNumber(link.score, 3)} | similarity ${formatNumber(link.similarity, 3)}${
                    link.isSynthetic ? " | aggregated" : ""
                  }`}
                </title>
              </path>
            );
          })}

          {layoutNodes.map((node) => {
            const label = node.isOther
              ? node.meta?.nameShort ?? "Other"
              : getNodeLabel(node);

            const shortLabel = ellipsize(label, node.isOther ? 18 : 20);

            const hasSelectedConnection =
              selectedEdgeId !== null &&
              layoutLinks.some(
                (link) =>
                  link.edgeId === selectedEdgeId &&
                  (link.sourceNode.id === node.id || link.targetNode.id === node.id),
              );

            const fill = node.isOther
              ? "#eef2f7"
              : hasSelectedConnection
                ? "#e2e8f0"
                : "#f3f4f6";

            const stroke = node.isOther
              ? "#cbd5e1"
              : hasSelectedConnection
                ? "#94a3b8"
                : "#d1d5db";

            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={10}
                  fill={fill}
                  stroke={stroke}
                />
                <text
                  x={node.x + 10}
                  y={node.y + 20}
                  fontSize={12}
                  fontWeight={node.isOther ? 500 : 600}
                  fill="#111827"
                >
                  {shortLabel}
                </text>
                {node.height > 42 && (
                  <text
                    x={node.x + 10}
                    y={node.y + 37}
                    fontSize={10.5}
                    fill="#64748b"
                  >
                    {node.isOther ? `size ${node.size}` : `C${node.clusterId} · size ${node.size}`}
                  </text>
                )}
                <title>
                  {`${label} | Run ${node.runId} | Size ${node.size} | Flow ${formatNumber(
                    node.totalFlow,
                    0,
                  )}${node.isOther ? " | remainder" : ""}`}
                </title>
              </g>
            );
          })}

          <text x={PADDING_LEFT} y={SVG_HEIGHT - 18} fontSize={12} fill="#6b7280">
            Top nodes per run are shown directly; lower-volume nodes are grouped into Other.
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <div className="rounded-md border bg-background px-3 py-2">
          Thickest band{" "}
          <span className="font-medium text-foreground">
            {formatNumber(maxStrokeValue, 0)}
          </span>
        </div>
        <div className="rounded-md border bg-background px-3 py-2">
          Selected edge{" "}
          <span className="font-medium text-foreground">{selectedEdgeId ?? "—"}</span>
        </div>
        <div className="rounded-md border bg-background px-3 py-2">
          Focus run{" "}
          <span className="font-medium text-foreground">{selectedRunId ?? "—"}</span>
        </div>
      </div>
    </section>
  );
}