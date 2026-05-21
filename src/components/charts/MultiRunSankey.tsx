// src/components/charts/MultiRunSankey.tsx
import { useMemo } from "react";

interface SankeyNodeMeta {
  nameShort?: string | null;
  nameTitle?: string | null;
  tags?: string[] | null;
}

interface SankeyNode {
  id: string;
  label: string;
  runId: number;
  clusterId: number;
  size: number;
  depth: number;
  meta?: SankeyNodeMeta;
}

interface SankeyLink {
  id: string;
  edgeId: number;
  source: string;
  target: string;
  value: number;
  overlapCount: number;
  score: number;
  overlapRatio: number;
  similarity: number;
}

export interface MultiRunSankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  stats?: {
    nodeCount: number;
    linkCount: number;
    runCount: number;
  };
}

interface MultiRunSankeyProps {
  data: MultiRunSankeyData;
  maxNodesPerColumn?: number;
  maxLinks?: number;
  selectedEdgeId?: number | null;
  onSelectEdge?: (edgeId: number) => void;
}

interface LayoutNode extends SankeyNode {
  x: number;
  y: number;
  width: number;
  height: number;
  shortLabel: string;
  totalThroughput: number;
}

interface LayoutLink extends SankeyLink {
  sourceNode: LayoutNode;
  targetNode: LayoutNode;
}

interface LayoutResult {
  layoutNodes: LayoutNode[];
  layoutLinks: LayoutLink[];
  runIds: number[];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function truncate(value: string, max = 20) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

export default function MultiRunSankey({
  data,
  maxNodesPerColumn = 10,
  maxLinks = 40,
  selectedEdgeId = null,
  onSelectEdge,
}: MultiRunSankeyProps) {
  const { layoutNodes, layoutLinks, runIds } = useMemo<LayoutResult>(() => {
    if (!data.nodes.length || !data.links.length) {
      return {
        layoutNodes: [],
        layoutLinks: [],
        runIds: [],
      };
    }

    const nodeById = new Map<string, SankeyNode>(
      data.nodes.map((node) => [node.id, node]),
    );

    const throughput = new Map<string, number>();
    for (const link of data.links) {
      throughput.set(link.source, (throughput.get(link.source) ?? 0) + link.value);
      throughput.set(link.target, (throughput.get(link.target) ?? 0) + link.value);
    }

    const nodesByDepth = new Map<number, SankeyNode[]>();
    for (const node of data.nodes) {
      const list = nodesByDepth.get(node.depth) ?? [];
      list.push(node);
      nodesByDepth.set(node.depth, list);
    }

    const depthLevels = [...nodesByDepth.keys()].sort((a, b) => a - b);
    const columnCount = depthLevels.length;

    const runIds = depthLevels.map((depth) => {
      const sample = nodesByDepth.get(depth)?.[0];
      return sample?.runId ?? depth;
    });

    const svgWidth = 1200;
    const svgHeight = 560;
    const columnWidth = 80;
    const columnGap =
      columnCount > 1
        ? (svgWidth - columnWidth * columnCount) / (columnCount - 1 + 2)
        : 0;

    const topPadding = 40;
    const verticalGap = 10;
    const minHeight = 16;
    const maxHeight = 60;

    const allThroughputs = data.nodes.map((node) => throughput.get(node.id) ?? 0);
    const globalMax = Math.max(...allThroughputs, 1);

    const layoutNodes: LayoutNode[] = [];

    depthLevels.forEach((depth, depthIndex) => {
      const columnNodes = nodesByDepth.get(depth) ?? [];

      columnNodes.sort((a, b) => {
        const aValue = throughput.get(a.id) ?? 0;
        const bValue = throughput.get(b.id) ?? 0;
        return bValue - aValue;
      });

      const limitedNodes = columnNodes.slice(0, maxNodesPerColumn);
      const x = columnGap + depthIndex * (columnWidth + columnGap);

      let cursorY = topPadding;

      for (const node of limitedNodes) {
        const totalThroughput = throughput.get(node.id) ?? 0;
        const height = clamp(
          (totalThroughput / globalMax) * maxHeight,
          minHeight,
          maxHeight,
        );

        const layoutNode: LayoutNode = {
          ...node,
          x,
          y: cursorY,
          width: columnWidth,
          height,
          shortLabel:
            node.meta?.nameShort?.trim() ||
            node.meta?.nameTitle?.trim() ||
            `C${node.clusterId}`,
          totalThroughput,
        };

        cursorY += height + verticalGap;
        layoutNodes.push(layoutNode);
      }
    });

    const layoutNodeById = new Map<string, LayoutNode>(
      layoutNodes.map((node) => [node.id, node]),
    );

    const limitedLinks = [...data.links]
      .sort((a, b) => b.value - a.value)
      .slice(0, maxLinks);

    const layoutLinks: LayoutLink[] = [];

    for (const link of limitedLinks) {
      const sourceNode = layoutNodeById.get(link.source);
      const targetNode = layoutNodeById.get(link.target);

      if (!sourceNode || !targetNode) {
        continue;
      }

      layoutLinks.push({
        ...link,
        sourceNode,
        targetNode,
      });
    }

    return {
      layoutNodes,
      layoutLinks,
      runIds,
    };
  }, [data, maxNodesPerColumn, maxLinks]);

  if (!layoutNodes.length || !layoutLinks.length) {
    return (
      <div className="rounded-md border border-dashed p-8 text-sm text-muted-foreground">
        No multi-run lineage data for this range.
      </div>
    );
  }

  const svgWidth = 1200;
  const svgHeight = 560;
  const maxValue = Math.max(...layoutLinks.map((link) => link.value), 1);

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-medium">Multi-run lineage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Runs: {runIds.join(" → ")}. Width of bands encodes overlap.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="h-[560px] w-full min-w-[900px]"
          role="img"
          aria-label={`Lineage across runs ${runIds.join(" to ")}`}
        >
          <defs>
            <linearGradient
              id="multiSankeyGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#9ca3af" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {runIds.map((runId, index) => {
            const columnNode = layoutNodes.find((node) => node.depth === index);
            if (!columnNode) return null;

            const centerX = columnNode.x + columnNode.width / 2;

            return (
              <text
                key={runId}
                x={centerX}
                y={20}
                fontSize={12}
                textAnchor="middle"
                fill="#4b5563"
              >
                Run {runId}
              </text>
            );
          })}

          {layoutLinks.map((link) => {
            const y1 = link.sourceNode.y + link.sourceNode.height / 2;
            const y2 = link.targetNode.y + link.targetNode.height / 2;
            const x1 = link.sourceNode.x + link.sourceNode.width;
            const x2 = link.targetNode.x;
            const midX = (x1 + x2) / 2;

            const path = `
              M ${x1} ${y1}
              C ${midX} ${y1},
                ${midX} ${y2},
                ${x2} ${y2}
            `;

            const strokeWidth = clamp((link.value / maxValue) * 18, 2, 18);
            const isSelected = selectedEdgeId === link.edgeId;

            return (
              <path
                key={link.id}
                d={path}
                fill="none"
                stroke="url(#multiSankeyGradient)"
                strokeWidth={strokeWidth}
                strokeOpacity={isSelected ? 0.9 : 0.4}
                strokeLinecap="round"
                className="cursor-pointer transition-opacity"
                onClick={() => onSelectEdge?.(link.edgeId)}
              >
                <title>
                  {`Edge ${link.edgeId}
value ${link.value} · overlap ${link.overlapCount}
score ${formatNumber(link.score, 3)} · sim ${formatNumber(link.similarity, 3)}`}
                </title>
              </path>
            );
          })}

          {layoutNodes.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx={3}
                fill="#e5e7eb"
                stroke="#9ca3af"
              />
              <text
                x={node.x - 6}
                y={node.y + node.height / 2}
                fontSize={11}
                textAnchor="end"
                dominantBaseline="middle"
                fill="#111827"
              >
                {truncate(node.shortLabel)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Bands connect clusters across runs. Click a band to sync with Euler detail or the lineage table.
      </div>
    </section>
  );
}