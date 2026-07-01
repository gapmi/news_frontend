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

  timelineRunIds: number[];
  anchorRunId: number | null;
  minScore: number;
  onSelectRun: (runId: number) => void;
  onChangeMinScore: (value: number) => void;

  onSelectEdge?: (edgeId: number) => void;
  onSelectCluster?: (runId: number, clusterId: number, label?: string | null) => void;
}

const modeMeta: Record<
  CanvasMode,
  {
    title: string;
    helper: string;
    empty: string;
  }
> = {
  overview: {
    title: "Lineage overview",
    helper: "Runs and threshold update the Sankey immediately in the same viewport.",
    empty: "No lineage overview data available for the selected run window.",
  },
  graph: {
    title: "Pair graph",
    helper: "Use the same run window and threshold, but inspect the pair-level graph separately.",
    empty: "No pair graph data available for the current run window.",
  },
  overlap: {
    title: "Overlap detail",
    helper: "Selected edge explanation stays in a dedicated view, separate from cluster structure.",
    empty: "Select an edge in overview or pair graph to open overlap detail.",
  },
};

function formatScore(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  return safeValue.toFixed(2);
}

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
        "min-h-10 rounded-lg border px-3 text-sm font-medium transition-colors",
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
  timelineRunIds,
  anchorRunId,
  minScore,
  onSelectRun,
  onChangeMinScore,
  onSelectEdge,
  onSelectCluster,
}: Props) {
  const activeWindowLabel =
    timelineRunIds.length > 0
      ? `${timelineRunIds[0]} → ${timelineRunIds[timelineRunIds.length - 1]}`
      : "—";

  const activePairLabel = selectedEdge
    ? `${selectedEdge.parentRunId}:${selectedEdge.parentClusterId} → ${selectedEdge.childRunId}:${selectedEdge.childClusterId}`
    : "No edge selected";

  return (
    <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
      {/* Card header */}
      <div className="border-b border-border/60 px-4 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Analysis stage
            </div>

            <div className="mt-2 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {modeMeta[mode].title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {modeMeta[mode].helper}
                </p>
              </div>

              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label="Lineage canvas modes"
              >
                <TabButton value="overview" activeValue={mode} onChange={onChangeMode}>
                  Overview
                </TabButton>
                <TabButton value="graph" activeValue={mode} onChange={onChangeMode}>
                  Pair graph
                </TabButton>
                <TabButton value="overlap" activeValue={mode} onChange={onChangeMode}>
                  Overlap
                </TabButton>
              </div>
            </div>
          </div>
        </div>

        {/* Context chips */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <div className="rounded-full border border-border/70 bg-background px-3 py-2">
            Window {activeWindowLabel}
          </div>
          <div className="rounded-full border border-border/70 bg-background px-3 py-2">
            Anchor {anchorRunId ?? "—"}
          </div>
          <div className="rounded-full border border-border/70 bg-background px-3 py-2">
            Threshold {formatScore(minScore)}
          </div>
          <div className="rounded-full border border-border/70 bg-background px-3 py-2">
            Pair edges {activeEdgeIds.size}
          </div>
          <div className="rounded-full border border-border/70 bg-background px-3 py-2">
            {activePairLabel}
          </div>
        </div>

        {/* Integrated controls — always close to chart */}
        <div className="mt-4 rounded-xl border border-border/70 bg-background p-3">
          <div className="grid gap-3">
            {/* Run timeline row */}
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">Run timeline</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Pick the anchor run and watch the active canvas update directly below.
                  </div>
                </div>

                <div className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {timelineRunIds.length}-run window
                </div>
              </div>

              {timelineRunIds.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                  No runs available.
                </div>
              ) : (
                <div className="-mx-1 overflow-x-auto pb-1">
                  <div className="flex min-w-max flex-nowrap gap-2 px-1">
                    {timelineRunIds.map((runId) => {
                      const isActive = anchorRunId === runId;

                      return (
                        <button
                          key={runId}
                          type="button"
                          onClick={() => onSelectRun(runId)}
                          aria-pressed={isActive}
                          className={[
                            "flex h-12 w-[84px] shrink-0 flex-col items-start justify-center rounded-lg border px-3 text-left transition-colors",
                            isActive
                              ? "border-foreground bg-foreground text-background shadow-sm"
                              : "border-border bg-background text-foreground hover:bg-muted/60",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "text-[10px] uppercase tracking-[0.14em]",
                              isActive ? "text-background/70" : "text-muted-foreground",
                            ].join(" ")}
                          >
                            {isActive ? "Anchor" : "Run"}
                          </span>
                          <span className="mt-1 text-base font-semibold leading-none">
                            {runId}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Threshold row */}
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_88px_auto] xl:items-end">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="lineage-min-score-range"
                      className="text-sm font-medium"
                    >
                      Threshold controls
                    </label>

                    <div className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-sm font-medium">
                      {formatScore(minScore)}
                    </div>
                  </div>

                  <input
                    id="lineage-min-score-range"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={minScore}
                    onChange={(event) => onChangeMinScore(Number(event.target.value))}
                    className="w-full accent-foreground"
                    aria-label="Minimum lineage edge score"
                  />

                  <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                    <span>0.00</span>
                    <span>0.50</span>
                    <span>1.00</span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lineage-min-score-input"
                    className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Exact
                  </label>

                  <input
                    id="lineage-min-score-input"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={minScore}
                    onChange={(event) => onChangeMinScore(Number(event.target.value))}
                    className="flex h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-foreground"
                    aria-label="Minimum score numeric input"
                  />
                </div>

                <div>
                  <div className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Presets
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[0.2, 0.35, 0.42, 0.55, 0.7].map((preset) => {
                      const active = Math.abs(minScore - preset) < 0.005;

                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => onChangeMinScore(preset)}
                          className={[
                            "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors",
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-background text-muted-foreground hover:bg-muted",
                          ].join(" ")}
                        >
                          {preset.toFixed(2)}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => onChangeMinScore(0.42)}
                      className="min-h-9 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas body */}
      <div className="px-4 py-4">
        <div
          id="lineage-canvas-panel-overview"
          role="tabpanel"
          aria-labelledby="lineage-canvas-tab-overview"
          hidden={mode !== "overview"}
        >
          {mode === "overview" ? (
            sankeyData ? (
              <div className="rounded-xl border border-border/70 bg-background p-2">
                <MultiRunSankey
                  data={sankeyData}
                  selectedEdgeId={selectedEdgeId}
                  activeEdgeIds={activeEdgeIds}
                  focusedRunId={focusedRunId}
                  onSelectEdge={onSelectEdge}
                  onSelectCluster={onSelectCluster}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-sm text-muted-foreground">
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
              <div className="rounded-xl border border-border/70 bg-background p-2">
                <LineageFlow
                  data={graphData}
                  selectedEdgeId={selectedEdgeId}
                  selectedRunId={focusedRunId}
                  activeEdgeIds={activeEdgeIds}
                  onSelectEdge={onSelectEdge}
                  onSelectCluster={onSelectCluster}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-sm text-muted-foreground">
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
                <div className="rounded-xl border border-border/70 bg-background p-2">
                  <EulerOverlapDiagram detail={eulerDetail} />
                </div>

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
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-sm text-muted-foreground">
                {modeMeta.overlap.empty}
              </div>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}