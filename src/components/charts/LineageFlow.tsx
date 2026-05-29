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

function GraphCanvas({
  data,
  selectedEdgeId,
  onSelectEdge,
  onSelectCluster,
}: Props) {
  const { nodes, edges } = useMemo(() => {
    const sourceNodes = data?.nodes ?? [];

    const runOrder = Array.from(
      new Set(sourceNodes.map((node) => node.runId)),
    ).sort((a, b) => a - b);

    const runIndex = new Map(
      runOrder.map((runId, index) => [runId, index]),
    );

    const nodesByRun = new Map<number, GraphNode[]>();
    for (const node of sourceNodes) {
      const bucket = nodesByRun.get(node.runId) ?? [];
      bucket.push(node);
      nodesByRun.set(node.runId, bucket);
    }

    for (const bucket of nodesByRun.values()) {
      bucket.sort((a, b) => a.clusterId - b.clusterId);
    }

    const graphNodes: Node[] = sourceNodes.map((node: GraphNode) => {
      const col = runIndex.get(node.runId) ?? 0;
      const row = (nodesByRun.get(node.runId) ?? []).findIndex(
        (item) => item.id === node.id,
      );

      const isConnectedToSelected =
        selectedEdgeId !== null &&
        (data?.edges ?? []).some(
          (edge) =>
            edge.edgeId === selectedEdgeId &&
            (edge.source === node.id || edge.target === node.id),
        );

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
          border: isConnectedToSelected ? "2px solid #0f172a" : "1px solid #cbd5e1",
          background: isConnectedToSelected ? "#e2e8f0" : "#ffffff",
          fontSize: 12,
          lineHeight: 1.35,
          whiteSpace: "pre-line",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          cursor: "pointer",
        },
      };
    });

    const graphEdges: Edge[] = (data?.edges ?? []).map((edge: GraphEdge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: `#${edge.edgeId} · ${formatNumber(edge.score, 2)}`,
      animated: selectedEdgeId === edge.edgeId,
      style: {
        stroke: selectedEdgeId === edge.edgeId ? "#0f172a" : "#94a3b8",
        strokeWidth:
          selectedEdgeId === edge.edgeId
            ? 3.5
            : Math.max(1.5, Math.min(6, edge.overlapCount / 4)),
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: selectedEdgeId === edge.edgeId ? "#0f172a" : "#94a3b8",
      },
      data: {
        edgeId: edge.edgeId,
      },
    }));

    return { nodes: graphNodes, edges: graphEdges };
  }, [data, selectedEdgeId]);

  if (!data || data.nodes.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-sm text-muted-foreground">
        No graph data available for this run window.
      </div>
    );
  }

  return (
    <div className="h-[640px] w-full overflow-hidden rounded-xl border bg-background">
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
          if (typeof edgeId === "number") onSelectEdge?.(edgeId);
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
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-medium">Cluster graph</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Click a cluster to inspect its articles, or an edge to inspect lineage overlap.
        </p>
      </div>

      <ReactFlowProvider>
        <GraphCanvas {...props} />
      </ReactFlowProvider>
    </section>
  );
}