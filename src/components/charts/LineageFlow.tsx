import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphEdge, GraphNode, GraphResponse } from "@/api/clustering";

type Props = {
  data: GraphResponse | null;
  selectedEdgeId?: number | null;
  selectedRunId?: number | null;
  activeEdgeIds?: Set<number>;
  onSelectEdge?: (edgeId: number) => void;
  onSelectCluster?: (runId: number, clusterId: number, label?: string | null) => void;
};

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function clusterLabel(node: GraphNode) {
  if (node.meta?.nameShort && String(node.meta.nameShort).trim().length > 0) {
    return String(node.meta.nameShort);
  }
  if (node.label && node.label.trim().length > 0) {
    return node.label;
  }
  return `C${node.clusterId}`;
}

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

function getRunColor(runId: number, runOrder: number[]) {
  const index = runOrder.indexOf(runId);
  return RUN_COLORS[index >= 0 ? index % RUN_COLORS.length : 0];
}

function GraphCanvas({
  data,
  selectedEdgeId = null,
  selectedRunId = null,
  activeEdgeIds = new Set<number>(),
  onSelectEdge,
  onSelectCluster,
}: Props) {
  const { nodes, edges } = useMemo(() => {
    const sourceNodes = data?.nodes ?? [];
    const sourceEdges = data?.edges ?? [];

    const runOrder = Array.from(new Set(sourceNodes.map((node) => node.runId))).sort(
      (a, b) => a - b,
    );

    const runIndex = new Map(runOrder.map((runId, index) => [runId, index]));

    const nodesByRun = new Map<number, GraphNode[]>();
    for (const node of sourceNodes) {
      const bucket = nodesByRun.get(node.runId) ?? [];
      bucket.push(node);
      nodesByRun.set(node.runId, bucket);
    }

    for (const bucket of nodesByRun.values()) {
      bucket.sort((a, b) => a.clusterId - b.clusterId);
    }

    const nodeMap = new Map(sourceNodes.map((node) => [node.id, node] as const));

    const graphNodes: Node[] = sourceNodes.map((node: GraphNode) => {
      const col = runIndex.get(node.runId) ?? 0;
      const row = (nodesByRun.get(node.runId) ?? []).findIndex(
        (item) => item.id === node.id,
      );

      const isConnectedToSelectedEdge =
        selectedEdgeId !== null &&
        sourceEdges.some(
          (edge) =>
            edge.edgeId === selectedEdgeId &&
            (edge.source === node.id || edge.target === node.id),
        );

      const isInSelectedRun = selectedRunId !== null && node.runId === selectedRunId;
      const isAdjacentToSelectedRun =
        selectedRunId !== null && Math.abs(node.runId - selectedRunId) === 1;

      return {
        id: node.id,
        position: {
          x: col * 260,
          y: row * 110,
        },
        data: {
          label: `${clusterLabel(node)}\nRun ${node.runId} · C${node.clusterId} · size ${node.size}`,
          runId: node.runId,
          clusterId: node.clusterId,
          shortLabel: clusterLabel(node),
        },
        style: {
          borderRadius: 16,
          padding: 12,
          width: 190,
          border: isConnectedToSelectedEdge
            ? "2px solid #0f172a"
            : isInSelectedRun
              ? `1.5px solid ${getRunColor(node.runId, runOrder)}`
              : "1px solid #cbd5e1",
          background: isConnectedToSelectedEdge
            ? "#e2e8f0"
            : isInSelectedRun
              ? "#eff6ff"
              : isAdjacentToSelectedRun
                ? "#faf5ff"
                : "#ffffff",
          fontSize: 12,
          lineHeight: 1.35,
          whiteSpace: "pre-line",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          cursor: "pointer",
        },
      };
    });

    const graphEdges: Edge[] = sourceEdges.map((edge: GraphEdge) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      const sourceRunId = sourceNode?.runId ?? null;
      const targetRunId = targetNode?.runId ?? null;

      const isSelected = selectedEdgeId === edge.edgeId;
      const isActivePairEdge = activeEdgeIds.has(edge.edgeId);

      const isWindowContextEdge =
        selectedRunId !== null &&
        (sourceRunId === selectedRunId || targetRunId === selectedRunId);

      const baseRunColor =
        selectedRunId !== null
          ? getRunColor(selectedRunId, runOrder)
          : sourceRunId !== null
            ? getRunColor(sourceRunId, runOrder)
            : "#94a3b8";

      let stroke = "#d4d4d8";
      let opacity = 0.14;
      let markerColor = "#d4d4d8";
      let strokeWidth = Math.max(1.5, Math.min(6, edge.overlapCount / 4));

      if (isActivePairEdge) {
        stroke = baseRunColor;
        markerColor = baseRunColor;
        opacity = 0.95;
        strokeWidth = Math.max(2.4, strokeWidth);
      } else if (isWindowContextEdge) {
        stroke = "#6b5a7a";
        markerColor = "#6b5a7a";
        opacity = 0.62;
      } else {
        stroke = "#d4d4d8";
        markerColor = "#d4d4d8";
        opacity = 0.14;
      }

      if (isSelected) {
        stroke = "#0f172a";
        markerColor = "#0f172a";
        opacity = 1;
        strokeWidth = Math.max(3.5, strokeWidth);
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: `#${edge.edgeId} · ${formatNumber(edge.score, 2)}`,
        animated: isSelected,
        style: {
          stroke,
          strokeOpacity: opacity,
          strokeWidth,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: markerColor,
        },
        className: isActivePairEdge ? "cursor-pointer" : undefined,
        data: {
          edgeId: edge.edgeId,
          isActivePairEdge,
        },
        labelStyle: {
          fontSize: 11,
          fill: "#475569",
        },
      };
    });

    return { nodes: graphNodes, edges: graphEdges };
  }, [data, selectedEdgeId, selectedRunId, activeEdgeIds]);

  if (!data || data.nodes.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-sm text-muted-foreground">
        No graph data available for this run window.
      </div>
    );
  }

  return (
    <div className="h-[460px] w-full overflow-hidden rounded-xl border bg-background sm:h-[540px] lg:h-[640px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => {
          const runId = node.data?.runId;
          const clusterId = node.data?.clusterId;
          const label = node.data?.shortLabel as string | undefined;

          if (typeof runId === "number" && typeof clusterId === "number") {
            onSelectCluster?.(runId, clusterId, label ?? null);
          }
        }}
        onEdgeClick={(_, edge) => {
          const edgeId = edge.data?.edgeId;
          const isActivePairEdge = edge.data?.isActivePairEdge;

          if (typeof edgeId === "number" && isActivePairEdge) {
            onSelectEdge?.(edgeId);
          }
        }}
      >
        <Background gap={24} size={1} />
        <MiniMap pannable zoomable />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default function LineageFlow(props: Props) {
  return (
    <section className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="mb-3">
        <h2 className="text-base font-medium sm:text-lg">Cluster graph</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bright lines open Euler detail for the current selected pair. Darker lines are
          context from the current run window.
        </p>
      </div>

      <ReactFlowProvider>
        <GraphCanvas {...props} />
      </ReactFlowProvider>
    </section>
  );
}