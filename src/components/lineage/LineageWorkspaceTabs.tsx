import { useEffect, useMemo, useRef } from "react";
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
  appliedMinScore: number;
  isFetching?: boolean;

  onSelectRun: (runId: number) => void;
  onChangeMinScoreDraft: (value: number) => void;
  onCommitMinScore: (value: number) => void;

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
    helper: "Runs and threshold update the Sankey directly below.",
    empty: "No lineage overview data available for the selected run window.",
  },
  graph: {
    title: "Pair graph",
    helper: "Same controls, separate graph view for pair-level inspection.",
    empty: "No pair graph data available for the current run window.",
  },
  overlap: {
    title: "Overlap detail",
    helper: "Selected edge explanation stays isolated from cluster structure.",
    empty: "Select an edge in overview or pair graph to open overlap detail.",
  },
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function formatScore(value: number) {
  return clampScore(value).toFixed(2);
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
        "inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium transition-colors",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function RunChip({
  runId,
  active,
  onClick,
  buttonRef,
}: {
  runId: number;
  active: boolean;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm transition-colors",
        active
          ? "border-foreground bg-foreground text-background shadow-sm"
          : "border-border bg-background text-foreground hover:bg-muted/60",
      ].join(" ")}
    >
      <span
        className={[
          "text-[10px] uppercase tracking-[0.14em]",
          active ? "text-background/70" : "text-muted-foreground",
        ].join(" ")}
      >
        {active ? "Anchor" : "Run"}
      </span>
      <span className="font-semibold leading-none">{runId}</span>
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
  appliedMinScore,
  isFetching = false,
  onSelectRun,
  onChangeMinScoreDraft,
  onCommitMinScore,
  onSelectEdge,
  onSelectCluster,
}: Props) {
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const activeRunButtonRef = useRef<HTMLButtonElement | null>(null);

  const safeScore = clampScore(minScore);
const safeAppliedScore = clampScore(appliedMinScore);

  const activeWindowLabel =
    timelineRunIds.length > 0
      ? `${timelineRunIds[0]} → ${timelineRunIds[timelineRunIds.length - 1]}`
      : "—";

  const activePairLabel = selectedEdge
    ? `${selectedEdge.parentRunId}:${selectedEdge.parentClusterId} → ${selectedEdge.childRunId}:${selectedEdge.childClusterId}`
    : "No edge selected";

  const thresholdPresets = useMemo(() => [0.2, 0.35, 0.42, 0.55, 0.7], []);

  useEffect(() => {
    if (!activeRunButtonRef.current) return;
    activeRunButtonRef.current.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [anchorRunId, timelineRunIds]);

  const scrollTimeline = (direction: "left" | "right") => {
    const container = timelineScrollRef.current;
    if (!container) return;

    const amount = Math.max(220, Math.floor(container.clientWidth * 0.75));
    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
      {/* Header */}
      <div className="border-b border-border/60 px-4 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Analysis stage
            </div>
            <div className="mt-2">
              <h2 className="text-lg font-semibold tracking-tight">
                {modeMeta[mode].title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {modeMeta[mode].helper}
              </p>
            </div>
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

        {/* Compact meta line */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Window {activeWindowLabel}</span>
          <span>Anchor {anchorRunId ?? "—"}</span>
          <span>Threshold {formatScore(safeScore)}</span>
          <span>Pair edges {activeEdgeIds.size}</span>
          <span>{activePairLabel}</span>
        </div>

        {/* Single compact command bar */}
        <div className="mt-4 rounded-xl border border-border/70 bg-background px-3 py-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
            {/* Run rail */}
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Run timeline</div>

                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {timelineRunIds.length}-run window
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollTimeline("left")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground transition-colors hover:bg-muted"
                    aria-label="Scroll run timeline left"
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollTimeline("right")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground transition-colors hover:bg-muted"
                    aria-label="Scroll run timeline right"
                  >
                    →
                  </button>
                </div>
              </div>

              {timelineRunIds.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 px-4 py-5 text-sm text-muted-foreground">
                  No runs available.
                </div>
              ) : (
                <div className="relative min-w-0">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background to-transparent" />

                  <div
                    ref={timelineScrollRef}
                    className="overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:thin]"
                  >
                    <div className="flex w-max min-w-full flex-nowrap gap-2 pr-2">
                      {timelineRunIds.map((runId) => {
                        const isActive = anchorRunId === runId;

                        return (
                          <RunChip
                            key={runId}
                            runId={runId}
                            active={isActive}
                            onClick={() => onSelectRun(runId)}
                            buttonRef={isActive ? activeRunButtonRef : undefined}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Threshold cluster */}
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Threshold</div>
                <div className="rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-sm font-medium">
                  {formatScore(safeScore)}
                </div>
              </div>

              <div className="grid gap-2">
                <input
                id="lineage-min-score-input"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={safeScore}
                onChange={(event) => onChangeMinScoreDraft(Number(event.target.value))}
                onBlur={(event) => onCommitMinScore(Number(event.target.value))}
                className="h-9 w-20 rounded-lg border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-foreground"
                aria-label="Minimum score numeric input"
                />

                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>0.00</span>
                  <span>0.50</span>
                  <span>1.00</span>
                </div>

                <div className="flex items-center gap-2">
                    <input
                    id="lineage-min-score-range"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={safeScore}
                    onChange={(event) => onChangeMinScoreDraft(Number(event.target.value))}
                    onMouseUp={(event) => onCommitMinScore(Number((event.target as HTMLInputElement).value))}
                    onTouchEnd={(event) => onCommitMinScore(Number((event.target as HTMLInputElement).value))}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            onCommitMinScore(Number((event.target as HTMLInputElement).value));
                        }
                        }}
                    onKeyUp={(event) => {
                        if (
                        event.key === "ArrowLeft" ||
                        event.key === "ArrowRight" ||
                        event.key === "Home" ||
                        event.key === "End" ||
                        event.key === "PageUp" ||
                        event.key === "PageDown"
                        ) {
                        onCommitMinScore(Number((event.target as HTMLInputElement).value));
                        }
                    }}
                    className="w-full accent-foreground"
                    aria-label="Minimum lineage edge score"
                    />

                  <div className="flex flex-wrap gap-2">
                    {thresholdPresets.map((preset) => {
                      const active = Math.abs(safeScore - preset) < 0.005;

                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => onCommitMinScore(Number(preset))}
                          className={[
                            "min-h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-card text-muted-foreground hover:bg-muted",
                          ].join(" ")}
                        >
                          {preset.toFixed(2)}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => onCommitMinScore(0.42)}
                      className="min-h-8 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
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

      {/* Canvas */}

      <div className="px-4 py-4">'
                {isFetching ? (
            <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex justify-end">
            <div className="rounded-full border border-border/70 bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                Updating…
            </div>
            </div>
        ) : null}
        <div
          id="lineage-canvas-panel-overview"
          role="tabpanel"
          aria-labelledby="lineage-canvas-tab-overview"
          hidden={mode !== "overview"}
        >
          {mode === "overview" ? (
            sankeyData ? (
              <div className="rounded-xl border border-border/70 bg-background">
                <div className="border-b border-border/60 px-4 py-3">
                  <div className="text-sm font-medium">Multi-run lineage</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Runs {activeWindowLabel}. Controls above affect this chart directly.
                  </div>
                </div>

                <div className="p-2">
                  <MultiRunSankey
                    data={sankeyData}
                    selectedEdgeId={selectedEdgeId}
                    activeEdgeIds={activeEdgeIds}
                    focusedRunId={focusedRunId}
                    onSelectEdge={onSelectEdge}
                    onSelectCluster={onSelectCluster}
                  />
                </div>
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
              <div className="rounded-xl border border-border/70 bg-background">
                <div className="border-b border-border/60 px-4 py-3">
                  <div className="text-sm font-medium">Pair graph</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Same window and threshold, separate graph-level inspection.
                  </div>
                </div>

                <div className="p-2">
                  <LineageFlow
                    data={graphData}
                    selectedEdgeId={selectedEdgeId}
                    selectedRunId={focusedRunId}
                    activeEdgeIds={activeEdgeIds}
                    onSelectEdge={onSelectEdge}
                    onSelectCluster={onSelectCluster}
                  />
                </div>
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
                <div className="rounded-xl border border-border/70 bg-background">
                  <div className="border-b border-border/60 px-4 py-3">
                    <div className="text-sm font-medium">Overlap detail</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Selected edge explanation separated from cluster structure.
                    </div>
                  </div>

                  <div className="p-2">
                    <EulerOverlapDiagram detail={eulerDetail} />
                  </div>
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