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

function GraphCanvas({ data, selectedEdgeId, onSelectEdge }: Props) {
  const { nodes, edges } = useMemo(() => {
    const graphNodes: Node[] = (data?.nodes ?? []).map((node: GraphNode) => {
      const pos = node.positionHint ?? { x: 0, y: 0 };

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
          x: Number.isFinite(pos.x) ? pos.x * 220 : 0,
          y: Number.isFinite(pos.y) ? pos.y * 120 : 0,
        },
        data: {
          label: `${clusterLabel(node)}\nRun ${node.runId} · C${node.clusterId} · size ${node.size}`,
          edgeId: node.clusterId,
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

    console.log("GRAPH NODES", data?.nodes?.slice(0, 5));
console.log("GRAPH EDGES", data?.edges?.slice(0, 5));

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
      <div className="mb-2 text-xs text-muted-foreground">
  nodes: {nodes.length} · edges: {edges.length}
</div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable={false}
        nodesConnectable={false}
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
          Click an edge to sync selection with the lineage table and Euler detail.
        </p>
      </div>

      <ReactFlowProvider>
        <GraphCanvas {...props} />
      </ReactFlowProvider>
    </section>
  );
}