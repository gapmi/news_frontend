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

const modeMeta: Record<
  CanvasMode,
  { title: string; description: string; empty: string }
> = {
  overview: {
    title: "Lineage overview",
    description:
      "Main canvas shows only the multi-run lineage map across the active run window.",
    empty: "No lineage overview data available for the selected run window.",
  },
  graph: {
    title: "Pair graph",
    description:
      "Pair-level cluster graph is isolated here and never mixed with cluster structure.",
    empty: "No pair graph data available for the current run window.",
  },
  overlap: {
    title: "Overlap detail",
    description:
      "Selected edge explanation mode with Euler overlap and pair-level evidence.",
    empty: "Select an edge in overview or pair graph to open overlap detail.",
  },
};

function TabButton({
  value,
  activeValue,
  onChange,
  children,
}: {
  value: CanvasMode;
  activeValue: CanvasMode;
  onChange: (value: CanvasMode) => void;
  children: React.ReactNode;
}) {
  const selected = value === activeValue;
  const tabId = `lineage-canvas-tab-${value}`;
  const panelId = `lineage-canvas-panel-${value}`;

  return (
    <button
      id={tabId}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      onClick={() => onChange(value)}
      className={[
        "min-h-11 rounded-xl border px-4 text-sm font-medium transition-colors",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

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
  const activePairLabel = selectedEdge
    ? `${selectedEdge.parentRunId}:${selectedEdge.parentClusterId} → ${selectedEdge.childRunId}:${selectedEdge.childClusterId}`
    : "No edge selected";

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Lineage canvas modes"
          >
            <TabButton value="overview" activeValue={mode} onChange={onChangeMode}>
              Lineage overview
            </TabButton>
            <TabButton value="graph" activeValue={mode} onChange={onChangeMode}>
              Pair graph
            </TabButton>
            <TabButton value="overlap" activeValue={mode} onChange={onChangeMode}>
              Overlap detail
            </TabButton>
          </div>

          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            {modeMeta[mode].title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
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
          {focusedRunId ? (
            <div className="rounded-full border border-border/70 bg-background px-3 py-2">
              Focused run {focusedRunId}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {selectedEdge ? (
            <div className="rounded-full border border-border/70 bg-background px-3 py-2">
              Active edge {activePairLabel}
            </div>
          ) : (
            <div className="rounded-full border border-border/70 bg-background px-3 py-2">
              No active edge
            </div>
          )}

          <div className="rounded-full border border-border/70 bg-background px-3 py-2">
            Pair edges {activeEdgeIds.size}
          </div>
        </div>

        <div
          id="lineage-canvas-panel-overview"
          role="tabpanel"
          aria-labelledby="lineage-canvas-tab-overview"
          hidden={mode !== "overview"}
        >
          {mode === "overview" ? (
            sankeyData ? (
              <MultiRunSankey
                data={sankeyData}
                selectedEdgeId={selectedEdgeId}
                activeEdgeIds={activeEdgeIds}
                focusedRunId={focusedRunId}
                onSelectEdge={onSelectEdge}
                onSelectCluster={onSelectCluster}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
                {modeMeta.overview.empty}
              </div>
            )
          ) : null}
        </div>

        <div
          id="lineage-canvas-panel-graph"
          role="tabpanel"
          aria-labelledby="lineage-canvas-tab-graph"
          hidden={mode !== "graph"}
        >
          {mode === "graph" ? (
            graphData ? (
              <LineageFlow
                data={graphData}
                selectedEdgeId={selectedEdgeId}
                selectedRunId={focusedRunId}
                activeEdgeIds={activeEdgeIds}
                onSelectEdge={onSelectEdge}
                onSelectCluster={onSelectCluster}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
                {modeMeta.graph.empty}
              </div>
            )
          ) : null}
        </div>

        <div
          id="lineage-canvas-panel-overlap"
          role="tabpanel"
          aria-labelledby="lineage-canvas-tab-overlap"
          hidden={mode !== "overlap"}
        >
          {mode === "overlap" ? (
            eulerDetail ? (
              <div className="space-y-4">
                <EulerOverlapDiagram detail={eulerDetail} />

                {selectedEdge ? (
                  <div className="rounded-xl border border-border/70 bg-background px-4 py-4">
                    <div className="text-sm font-medium">Selected edge</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
                        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Pair
                        </div>
                        <div className="mt-2 text-sm font-medium">
                          {selectedEdge.parentRunId}:{selectedEdge.parentClusterId} →{" "}
                          {selectedEdge.childRunId}:{selectedEdge.childClusterId}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
                        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Score
                        </div>
                        <div className="mt-2 text-sm font-medium">
                          {selectedEdge.score.toFixed(3)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
                        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Similarity
                        </div>
                        <div className="mt-2 text-sm font-medium">
                          {selectedEdge.centroidSimilarity.toFixed(3)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
                        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Overlap
                        </div>
                        <div className="mt-2 text-sm font-medium">
                          {selectedEdge.articleOverlapCount} ·{" "}
                          {selectedEdge.articleOverlapRatio.toFixed(3)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
                {modeMeta.overlap.empty}
              </div>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}