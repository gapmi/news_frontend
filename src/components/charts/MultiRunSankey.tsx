import { useEffect, useMemo, useRef } from "react";
import type { SankeyLink, SankeyNode, SankeyResponse } from "@/api/clustering";

type Props = {
  data: SankeyResponse | null;
  selectedEdgeId?: number | null;
  activeEdgeIds?: Set<number>;
  focusedRunId?: number | null;
  onSelectEdge?: (edgeId: number) => void;
  onSelectCluster?: (runId: number, clusterId: number, label?: string | null) => void;
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

type ColumnBand = {
  key: string;
  runId: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
  isFocus: boolean;
};

const SVG_HEIGHT = 520;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 12;
const COLUMN_GAP = 220;
const PADDING_LEFT = 72;
const PADDING_RIGHT = 72;
const COLUMN_NODE_WIDTH = 136;
const NODE_GAP = 14;
const MIN_NODE_HEIGHT = 24;
const MAX_NODE_HEIGHT = 88;
const MIN_STROKE = 2;
const MAX_STROKE = 18;
const MAX_NODES_PER_COLUMN = 8;

const BAND_X_PADDING = 20;
const BAND_Y_PADDING = 10;
const BAND_RADIUS = 26;

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
  let y2 = targetNode.y + targetNode.height / 2;

  if (Math.abs(y2 - y1) < 0.01) {
    y2 += 0.001;
  }

  const dx = x2 - x1;
  const curve = Math.max(40, dx * 0.4);

  return `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;
}

function getNumericEdgeId(link: SankeyLink): number | null {
  const raw = (link as { edgeId?: number }).edgeId;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return null;
}

export default function MultiRunSankey({
  data,
  selectedEdgeId = null,
  activeEdgeIds = new Set<number>(),
  focusedRunId = null,
  onSelectEdge,
  onSelectCluster,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const {
    columns,
    columnBands,
    layoutNodes,
    layoutLinks,
    maxStrokeValue,
    minRunId,
    maxRunId,
  } = useMemo(() => {
    const nodes = data?.nodes ?? [];
    const links = data?.links ?? [];

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

      const visible = prepared.slice(0, MAX_NODES_PER_COLUMN);
      const hidden = prepared.slice(MAX_NODES_PER_COLUMN);

      visibleNodeIdMap.set(depth, new Set(visible.map((node) => node.id)));
      hiddenNodeIdMap.set(depth, new Set(hidden.map((node) => node.id)));

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

    const nodeMap = new Map(nodes.map((node) => [node.id, node] as const));

    for (const link of links) {
      const sourceNode = nodeMap.get(link.source);
      const targetNode = nodeMap.get(link.target);
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
          existing.isSynthetic ||
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

    const layoutNodeMap = new Map(layoutNodes.map((node) => [node.id, node] as const));

    const remappedLinks = [...remappedLinksMap.values()].filter(
      (link) => layoutNodeMap.has(link.source) && layoutNodeMap.has(link.target),
    );

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

    const columnBands: ColumnBand[] = preparedColumns
      .map((column) => {
        const columnNodes = layoutNodes.filter(
          (node) => node.columnIndex === column.columnIndex,
        );

        if (columnNodes.length === 0) return null;

        const top = Math.min(...columnNodes.map((node) => node.y)) - BAND_Y_PADDING;
        const bottom =
          Math.max(...columnNodes.map((node) => node.y + node.height)) + BAND_Y_PADDING;

        const x = getColumnX(column.columnIndex) - BAND_X_PADDING;
        const width = COLUMN_NODE_WIDTH + BAND_X_PADDING * 2;
        const y = top;
        const height = bottom - top;

        return {
          key: `band-${column.depth}`,
          runId: column.runId,
          x,
          y,
          width,
          height,
          labelX: x + width / 2,
          labelY: Math.max(40, y - 10),
          isFocus: column.runId !== null && focusedRunId !== null && column.runId === focusedRunId,
        };
      })
      .filter(Boolean) as ColumnBand[];

    return {
      columns: preparedColumns,
      columnBands,
      layoutNodes,
      layoutLinks,
      maxStrokeValue,
      minRunId,
      maxRunId,
    };
  }, [data, focusedRunId]);

  useEffect(() => {
    if (!scrollRef.current || focusedRunId === null || columnBands.length === 0) {
      return;
    }

    const targetBand = columnBands.find((band) => band.runId === focusedRunId);
    if (!targetBand) {
      return;
    }

    const container = scrollRef.current;
    const targetCenter = targetBand.x + targetBand.width / 2;
    const nextLeft = clamp(
      targetCenter - container.clientWidth / 2,
      0,
      Math.max(0, container.scrollWidth - container.clientWidth),
    );

    container.scrollTo({
      left: nextLeft,
      behavior: "smooth",
    });
  }, [focusedRunId, columnBands]);

  if (!data || !data.nodes.length) {
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
            Runs {minRunId ?? "—"} → {maxRunId ?? "—"}. Bright links belong to the current
            selected pair and open Euler detail; darker links are context only.
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

      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-xl border bg-background"
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`}
          className="h-[520px]"
          style={{ width: `${svgWidth}px`, minWidth: `${svgWidth}px` }}
        >
          {columnBands.map((band) => (
            <g key={band.key} pointerEvents="none">
              <rect
                x={band.x}
                y={band.y}
                width={band.width}
                height={band.height}
                rx={BAND_RADIUS}
                fill={band.isFocus ? "#fef3c7" : "#f5f3ff"}
                fillOpacity={band.isFocus ? 0.7 : 0.4}
                stroke={band.isFocus ? "#f59e0b" : "#c4b5fd"}
                strokeOpacity={band.isFocus ? 0.55 : 0.32}
                strokeWidth={band.isFocus ? 1.4 : 1}
              />
              <text
                x={band.labelX}
                y={band.labelY}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill={band.isFocus ? "#92400e" : "#6d28d9"}
              >
                {`Run ${band.runId ?? "—"}`}
              </text>
            </g>
          ))}

          {layoutLinks.map((link) => {
            const isSelected =
              selectedEdgeId !== null &&
              link.edgeId !== null &&
              selectedEdgeId === link.edgeId;

            const isActivePairEdge =
              link.edgeId !== null && activeEdgeIds.has(link.edgeId);

            if (isSelected || isActivePairEdge) return null;

            return (
              <path
                key={link.id}
                d={link.path}
                fill="none"
                stroke="#6b5a7a"
                strokeWidth={link.strokeWidth}
                strokeOpacity={0.42}
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              >
                <title>
                  {`${link.sourceNode.label} → ${link.targetNode.label}
                    Overlap ${link.value}
                    Score ${formatNumber(link.score, 3)}
                    Similarity ${formatNumber(link.similarity, 3)}
                    Context only`}
                </title>
              </path>
            );
          })}

          {layoutLinks.map((link) => {
            const isSelected =
              selectedEdgeId !== null &&
              link.edgeId !== null &&
              selectedEdgeId === link.edgeId;

            const isActivePairEdge =
              link.edgeId !== null && activeEdgeIds.has(link.edgeId);

            if (!isSelected && !isActivePairEdge) return null;

            const haloColor = isSelected ? "#f59e0b" : "#a78bfa";
            const haloOpacity = isSelected ? 0.26 : 0.18;
            const haloWidth = link.strokeWidth + (isSelected ? 10 : 7);

            return (
              <path
                key={`${link.id}-halo`}
                d={link.path}
                fill="none"
                stroke={haloColor}
                strokeWidth={haloWidth}
                strokeOpacity={haloOpacity}
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
            );
          })}

          {layoutLinks.map((link) => {
            const isSelected =
              selectedEdgeId !== null &&
              link.edgeId !== null &&
              selectedEdgeId === link.edgeId;

            const isActivePairEdge =
              link.edgeId !== null && activeEdgeIds.has(link.edgeId);

            if (!isSelected && !isActivePairEdge) return null;

            const isClickable = link.edgeId !== null && isActivePairEdge;
            const stroke = isSelected ? "#0f172a" : "#7c3aed";
            const strokeOpacity = isSelected ? 1 : 0.95;

            return (
              <path
                key={`${link.id}-main`}
                d={link.path}
                fill="none"
                stroke={stroke}
                strokeWidth={link.strokeWidth}
                strokeOpacity={strokeOpacity}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isClickable ? "cursor-pointer" : undefined}
                onClick={() => {
                  if (isClickable) {
                    onSelectEdge?.(link.edgeId!);
                  }
                }}
              >
                <title>
                  {`${link.sourceNode.label} → ${link.targetNode.label}
                    Overlap ${link.value}
                    Score ${formatNumber(link.score, 3)}
                    Similarity ${formatNumber(link.similarity, 3)}
                    ${isActivePairEdge ? "Available in Euler detail" : "Selected edge"}`}
                </title>
              </path>
            );
          })}

          {layoutNodes.map((node) => {
            const label = node.isOther ? node.meta?.nameShort ?? "Other" : getNodeLabel(node);
            const shortLabel = ellipsize(label, node.isOther ? 18 : 20);

            const hasSelectedConnection =
              selectedEdgeId !== null &&
              layoutLinks.some(
                (link) =>
                  link.edgeId === selectedEdgeId &&
                  (link.sourceNode.id === node.id || link.targetNode.id === node.id),
              );

            const isFocusedRun = focusedRunId !== null && node.runId === focusedRunId;
            const isSelectableCluster = !node.isOther && node.clusterId >= 0;

            return (
              <g
                key={node.id}
                className={isSelectableCluster ? "cursor-pointer" : undefined}
                onClick={() => {
                  if (isSelectableCluster) {
                    onSelectCluster?.(node.runId, node.clusterId, label);
                  }
                }}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={10}
                  fill={
                    node.isOther
                      ? "#eef2f7"
                      : hasSelectedConnection
                        ? "#e2e8f0"
                        : isFocusedRun
                          ? "#fffbeb"
                          : "#f3f4f6"
                  }
                  stroke={
                    node.isOther
                      ? "#cbd5e1"
                      : hasSelectedConnection
                        ? "#94a3b8"
                        : isFocusedRun
                          ? "#f59e0b"
                          : "#d1d5db"
                  }
                />
                <text
                  x={node.x + 10}
                  y={node.y + 20}
                  fontSize="12"
                  fontWeight={node.isOther ? 500 : 600}
                  fill="#111827"
                  pointerEvents="none"
                >
                  {shortLabel}
                </text>
                {node.height > 42 && (
                  <text
                    x={node.x + 10}
                    y={node.y + 37}
                    fontSize="10.5"
                    fill="#64748b"
                    pointerEvents="none"
                  >
                    {node.isOther ? `size ${node.size}` : `C${node.clusterId} · size ${node.size}`}
                  </text>
                )}
                <title>
                  {`${label}
                    Run ${node.runId}
                    Size ${node.size}
                    Flow ${formatNumber(node.totalFlow, 0)}
                    ${node.isOther ? "Aggregated remainder" : ""}`}
                </title>
              </g>
            );
          })}

          <text x={PADDING_LEFT} y={SVG_HEIGHT - 18} fontSize="12" fill="#6b7280" pointerEvents="none">
            Top nodes per run are shown directly; lower-volume nodes are grouped into “Other”.
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <div className="rounded-md border bg-background px-3 py-2">
          Thickest band{" "}
          <span className="font-medium text-foreground">{formatNumber(maxStrokeValue, 0)}</span>
        </div>
        <div className="rounded-md border bg-background px-3 py-2">
          Selected edge{" "}
          <span className="font-medium text-foreground">{selectedEdgeId ?? "—"}</span>
        </div>
        <div className="rounded-md border bg-background px-3 py-2">
          Focused run{" "}
          <span className="font-medium text-foreground">{focusedRunId ?? "—"}</span>
        </div>
      </div>
    </section>
  );
}