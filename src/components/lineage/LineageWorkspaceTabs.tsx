import type {
  EulerPairDetail,
  GraphResponse,
  LineageEdge,
  SankeyResponse,
} from "@/api/clustering";
import MultiRunSankey from "@/components/charts/MultiRunSankey";
import LineageFlow from "@/components/charts/LineageFlow";
import EulerOverlapDiagram from "@/components/charts/EulerOverlapDiagram";

export type CanvasMode = "overview" | "graph" | "overlap";

interface Props {
  mode: CanvasMode;
  onChangeMode: (mode: CanvasMode) => void;
  sankeyData: SankeyResponse | null;
  graphData: GraphResponse | null;
  eulerDetail: EulerPairDetail | null;
  selectedEdge: LineageEdge | null;
  selectedEdgeId?: number | null;
  activeEdgeIds?: Set<number>;
  focusedRunId?: number | null;
  onSelectEdge?: (edgeId: number) => void;
  onSelectCluster?: (runId: number, clusterId: number, label?: string | null) => void;
}

const modeMeta: Record<CanvasMode, { title: string; description: string }> = {
  overview: {
    title: "Lineage overview",
    description:
      "Main canvas shows only the multi-run lineage map across the active run window.",
  },
  graph: {
    title: "Pair graph",
    description:
      "Pair-level cluster graph is isolated here and never mixed with cluster structure.",
  },
  overlap: {
    title: "Overlap detail",
    description:
      "Selected edge explanation mode with Euler overlap and pair-level evidence.",
  },
};

export default function LineageWorkspaceTabs({
  mode,
  onChangeMode,
  sankeyData,
  graphData,
  eulerDetail,
  selectedEdge,
  selectedEdgeId = null,
  activeEdgeIds = new Set<number>(),
  focusedRunId = null,
  onSelectEdge,
  onSelectCluster,
}: Props) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            {(["overview", "graph", "overlap"] as CanvasMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onChangeMode(item)}
                className={[
                  "min-h-11 rounded-xl border px-4 text-sm font-medium transition-colors",
                  mode === item
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                {item === "overview"
                  ? "Lineage overview"
                  : item === "graph"
                    ? "Pair graph"
                    : "Overlap detail"}
              </button>
            ))}
          </div>

          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            {modeMeta[mode].title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {modeMeta[mode].description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <div className="rounded-full border border-border/70 bg-background px-3 py-2">
            One canvas mode at a time
          </div>
          <div className="rounded-full border border-border/70 bg-background px-3 py-2">
            Inspector holds structure
          </div>
        </div>
      </div>

      <div className="mt-4">
        {mode === "overview" ? (
          <MultiRunSankey
            data={sankeyData}
            selectedEdgeId={selectedEdgeId}
            activeEdgeIds={activeEdgeIds}
            focusedRunId={focusedRunId}
            onSelectEdge={onSelectEdge}
            onSelectCluster={onSelectCluster}
          />
        ) : mode === "graph" ? (
          <LineageFlow
            data={graphData}
            selectedEdgeId={selectedEdgeId}
            selectedRunId={focusedRunId}
            activeEdgeIds={activeEdgeIds}
            onSelectEdge={onSelectEdge}
            onSelectCluster={onSelectCluster}
          />
        ) : eulerDetail ? (
          <EulerOverlapDiagram detail={eulerDetail} />
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
            Select an edge in overview or pair graph to open overlap detail.
          </div>
        )}
      </div>

      {mode === "overlap" && selectedEdge ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-background px-4 py-4 text-sm text-muted-foreground">
          Edge #{selectedEdge.edgeId}: {selectedEdge.parentRunId}:{selectedEdge.parentClusterId} →{" "}
          {selectedEdge.childRunId}:{selectedEdge.childClusterId}
        </div>
      ) : null}
    </section>
  );
}