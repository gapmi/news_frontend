// src/components/charts/LineageSankey.tsx
import { useMemo } from "react";
import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
  type TooltipProps,
} from "recharts";

type SankeyNode = {
  id: string;
  label: string;
  runId: number;
  clusterId: number;
  size: number;
  depth: number;
  meta?: {
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
};

type RechartsNode = SankeyNode;

type RechartsLink = {
  id: string;
  edgeId: number;
  source: number;
  target: number;
  value: number;
  score: number;
  overlapRatio: number;
  overlapCount: number;
  similarity: number;
  sourceId: string;
  targetId: string;
};

type Props = {
  data: LineageSankeyData;
};

function formatNumber(value: number, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function SankeyTooltipContent({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0]?.payload as any;
  if (!item) return null;

  if (typeof item.edgeId === "number") {
    const sourceLabel = item.source?.label ?? item.sourceId ?? "—";
    const targetLabel = item.target?.label ?? item.targetId ?? "—";

    return (
      <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
        <div className="font-medium">
          Edge {item.edgeId} · {sourceLabel} → {targetLabel}
        </div>
        <div className="mt-1 text-muted-foreground">
          Value: {item.value} · Overlap: {item.overlapCount} (
          {formatNumber(item.overlapRatio, 2)})
        </div>
        <div className="mt-1 text-muted-foreground">
          Score: {formatNumber(item.score)} · Similarity:{" "}
          {formatNumber(item.similarity)}
        </div>
      </div>
    );
  }

  const node = item as RechartsNode;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="font-medium">
        Run {node.runId} · C{node.clusterId}
      </div>
      <div className="mt-1 text-muted-foreground">{node.label}</div>
      <div className="mt-1 text-muted-foreground">Size: {node.size}</div>
      {node.meta?.nameShort && (
        <div className="mt-1 text-muted-foreground">
          Short: {node.meta.nameShort}
        </div>
      )}
    </div>
  );
}

export default function LineageSankey({ data }: Props) {
  const chartData = useMemo(() => {
    const nodes: RechartsNode[] = data.nodes.map((node) => ({ ...node }));

    const nodeIndexById = new Map<string, number>();
    nodes.forEach((node, index) => {
      nodeIndexById.set(node.id, index);
    });

    const links: RechartsLink[] = data.links
      .map((link) => {
        const sourceIndex = nodeIndexById.get(link.source);
        const targetIndex = nodeIndexById.get(link.target);

        if (sourceIndex === undefined || targetIndex === undefined) {
          return null;
        }

        return {
          id: link.id,
          edgeId: link.edgeId,
          source: sourceIndex,
          target: targetIndex,
          value: link.value,
          score: link.score,
          overlapRatio: link.overlapRatio,
          overlapCount: link.overlapCount,
          similarity: link.similarity,
          sourceId: link.source,
          targetId: link.target,
        };
      })
      .filter(Boolean) as RechartsLink[];

    return { nodes, links };
  }, [data]);

  if (!chartData.nodes.length || !chartData.links.length) {
    return (
      <div className="rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground">
        No Sankey data for this pair and score threshold.
      </div>
    );
  }

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={chartData}
          nodePadding={18}
          nodeWidth={20}
          linkCurvature={0.6}
          iterations={32}
          sort
          margin={{ top: 24, right: 180, bottom: 24, left: 24 }}
          node={(props: any) => {
            const { x, y, width, height, payload, index } = props;
            const node = payload as RechartsNode;
            const isParent = node.depth === 0;
            const fill = isParent ? "#dbeafe" : "#ede9fe";
            const stroke = isParent ? "#60a5fa" : "#8b5cf6";
            const label = node.meta?.nameShort ?? node.label;

            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx={6}
                  fill={fill}
                  stroke={stroke}
                />
                <text
                  x={x + width + 8}
                  y={y + height / 2}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="#4b5563"
                >
                  {label.length > 42 ? `${label.slice(0, 42)}…` : label}
                </text>
              </g>
            );
          }}
          link={(props: any) => {
            const {
              sourceX,
              sourceY,
              targetX,
              targetY,
              linkWidth,
              payload,
              index,
            } = props;

            const link = payload as RechartsLink;
            const path = `
              M ${sourceX},${sourceY}
              C ${(sourceX + targetX) / 2},${sourceY}
                ${(sourceX + targetX) / 2},${targetY}
                ${targetX},${targetY}
            `;
            const opacity = 0.25 + Math.min(link.value / 160, 0.45);

            return (
              <g key={index}>
                <path
                  d={path}
                  fill="none"
                  stroke="url(#lineage-sankey-gradient)"
                  strokeWidth={Math.max(1.5, linkWidth)}
                  strokeOpacity={opacity}
                />
              </g>
            );
          }}
        >
          <defs>
            <linearGradient id="lineage-sankey-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <Tooltip content={<SankeyTooltipContent />} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}