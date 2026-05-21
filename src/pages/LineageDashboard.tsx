import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  clusteringKeys,
  getClusteringRuns,
  getEulerPairDetail,
  getLineageEdges,
  getPipelineRuns,
} from "@/api/clustering";
import StoryHeaderCard from "@/components/lineage/StoryHeaderCard";
import RunTimelineSlider from "@/components/lineage/RunTimelineSlider";
import LineageRightPanel from "@/components/lineage/LineageRightPanel";
import EulerDetailModal from "@/components/lineage/EulerDetailModal";
import MultiRunSankey from "@/components/charts/MultiRunSankey";
import LineageFlow from "@/components/charts/LineageFlow";
import { getLineageWindow } from "@/utils/lineageWindow";
import { getSankeyView, type LineageEdge } from "@/api/clustering";

interface RunPair {
  parentRunId: number;
  childRunId: number;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function formatClusterRef(clusterId: number, label?: string | null) {
  return label ? `${label} · C${clusterId}` : `Cluster ${clusterId}`;
}

export default function LineageDashboard() {
  const [manualParentRunId, setManualParentRunId] = useState<number | null>(null);
  const [manualChildRunId, setManualChildRunId] = useState<number | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);
  const [tagLanguage, setTagLanguage] = useState<"RU" | "EN">("RU");

  const runsQuery = useQuery({
    queryKey: clusteringKeys.runs({ status: "success", limit: 20 }),
    queryFn: () => getClusteringRuns({ status: "success", limit: 20 }),
  });

  const pipelineRunsQuery = useQuery({
    queryKey: clusteringKeys.pipelineRuns({ job_type: "pipeline", limit: 5 }),
    queryFn: () => getPipelineRuns({ job_type: "pipeline", limit: 5 }),
  });

  const runs = runsQuery.data?.items ?? [];
  const pipelineRuns = pipelineRunsQuery.data?.items ?? [];
  const latestRun = runs[0] ?? null;
  const latestPipelineRun = pipelineRuns[0] ?? null;

  const lineageRuns = useMemo(() => {
    return runs.filter(
      (run) => run.parentLineageEdgeCount > 0 || run.childLineageEdgeCount > 0,
    );
  }, [runs]);

  const sortedLineageRunIds = useMemo(() => {
    return [...new Set(lineageRuns.map((run) => run.runId))].sort((a, b) => a - b);
  }, [lineageRuns]);

  const availablePairs = useMemo<RunPair[]>(() => {
    if (sortedLineageRunIds.length < 2) return [];

    return sortedLineageRunIds.slice(0, -1).map((parentRunId, index) => ({
      parentRunId,
      childRunId: sortedLineageRunIds[index + 1],
    }));
  }, [sortedLineageRunIds]);

  const defaultPair = availablePairs[0] ?? null;
  const parentRunId = manualParentRunId ?? defaultPair?.parentRunId ?? null;

  const childOptions = useMemo(() => {
    if (parentRunId === null) return [];
    return availablePairs
      .filter((pair) => pair.parentRunId === parentRunId)
      .map((pair) => pair.childRunId);
  }, [availablePairs, parentRunId]);

  const childRunId = useMemo(() => {
    if (manualChildRunId !== null && childOptions.includes(manualChildRunId)) {
      return manualChildRunId;
    }
    return childOptions[0] ?? null;
  }, [manualChildRunId, childOptions]);

  useEffect(() => {
    if (childOptions.length === 0) {
      setManualChildRunId(null);
      return;
    }
    if (childRunId === null || !childOptions.includes(childRunId)) {
      setManualChildRunId(childOptions[0]);
    }
  }, [childOptions, childRunId]);

  const sankeyWindow = useMemo(() => {
    if (parentRunId === null) return null;
    return getLineageWindow(sortedLineageRunIds, parentRunId, 5);
  }, [sortedLineageRunIds, parentRunId]);

  const timelineRunIds = sankeyWindow?.runIds ?? [];

  const sankeyParams = sankeyWindow
    ? {
        start_run_id: sankeyWindow.startRunId,
        end_run_id: sankeyWindow.endRunId,
        min_score: minScore,
      }
    : null;

  const edgeParams =
    parentRunId !== null &&
    childRunId !== null &&
    parentRunId < childRunId
      ? {
          parent_run_id: parentRunId,
          child_run_id: childRunId,
          min_score: minScore,
          limit: 50,
        }
      : null;

  const sankeyQuery = useQuery({
    queryKey: sankeyParams
      ? clusteringKeys.sankey(sankeyParams)
      : clusteringKeys.sankey({ start_run_id: 0, end_run_id: 0 }),
    queryFn: () => getSankeyView(sankeyParams!),
    enabled: Boolean(sankeyParams),
    placeholderData: keepPreviousData,
  });

  const edgesQuery = useQuery({
    queryKey: edgeParams
      ? clusteringKeys.lineageEdges(edgeParams)
      : clusteringKeys.lineageEdges({ limit: 50 }),
    queryFn: () => getLineageEdges(edgeParams!),
    enabled: Boolean(edgeParams),
    placeholderData: keepPreviousData,
  });

  const eulerQuery = useQuery({
    queryKey: selectedEdgeId
      ? clusteringKeys.euler(selectedEdgeId)
      : clusteringKeys.euler(0),
    queryFn: () => getEulerPairDetail(selectedEdgeId!),
    enabled: selectedEdgeId !== null,
  });

  const edges = edgesQuery.data?.items ?? [];
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.edgeId === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const totalVisibleLineageEdges = useMemo(() => {
    return runs.reduce((sum, run) => sum + run.parentLineageEdgeCount, 0);
  }, [runs]);

  const storyTitle =
    latestRun?.clusterCount
      ? "Taiwan chip sanctions storyline"
      : "Storyline preview";

  const storySubtitle =
    latestPipelineRun?.status
      ? `Latest pipeline run: ${latestPipelineRun.status}. Last start: ${formatDateTime(
          latestPipelineRun.startedAt,
        )}.`
      : "Track how a storyline flows through adjacent lineage runs and inspect overlap on demand.";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="grid gap-4">
          <StoryHeaderCard title={storyTitle} subtitle={storySubtitle} />

          <RunTimelineSlider
            runIds={timelineRunIds}
            selectedRunId={parentRunId}
            onSelectRun={(runId) => {
              const nextChildOptions = availablePairs
                .filter((pair) => pair.parentRunId === runId)
                .map((pair) => pair.childRunId);

              setManualParentRunId(runId);
              setManualChildRunId(nextChildOptions[0] ?? null);
              setSelectedEdgeId(null);
            }}
          />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_360px]">
            <div className="space-y-4">
              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium">Semantic map</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Anchor run {parentRunId ?? "—"} · Pair {parentRunId ?? "—"} → {childRunId ?? "—"} · Window {sankeyWindow?.startRunId ?? "—"} → {sankeyWindow?.endRunId ?? "—"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-lg border bg-background p-1 text-xs">
                      <span className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground">
                        Sankey
                      </span>
                      <span className="px-3 py-1.5 text-muted-foreground">Graph</span>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Min score</span>
                      <input
                        className="w-24 rounded-md border bg-background px-3 py-2"
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={minScore}
                        onChange={(event) => {
                          setMinScore(Number(event.target.value));
                          setSelectedEdgeId(null);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {sankeyQuery.isLoading && (
                  <p className="text-sm text-muted-foreground">Loading Sankey…</p>
                )}

                {sankeyQuery.error && (
                  <p className="text-sm text-red-600">
                    {(sankeyQuery.error as Error).message}
                  </p>
                )}

                {sankeyQuery.data && (
                  <MultiRunSankey
                    data={sankeyQuery.data}
                    selectedEdgeId={selectedEdgeId}
                    onSelectEdge={setSelectedEdgeId}
                  />
                )}
              </section>

              <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <h2 className="text-lg font-medium">Lineage edges</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Detail pair table for Euler inspection
                  </p>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 pr-4">Edge</th>
                          <th className="py-2 pr-4">Parent</th>
                          <th className="py-2 pr-4">Child</th>
                          <th className="py-2 pr-4">Score</th>
                          <th className="py-2 pr-4">Similarity</th>
                          <th className="py-2 pr-4">Overlap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {edges.map((edge: LineageEdge) => {
                          const isSelected = selectedEdgeId === edge.edgeId;

                          return (
                            <tr
                              key={edge.edgeId}
                              className={
                                isSelected
                                  ? "cursor-pointer border-b bg-muted hover:bg-muted"
                                  : "cursor-pointer border-b hover:bg-muted/50"
                              }
                              onClick={() => setSelectedEdgeId(edge.edgeId)}
                            >
                              <td className="py-2 pr-4">{edge.edgeId}</td>
                              <td className="py-2 pr-4">
                                {formatClusterRef(edge.parentClusterId)}<br />
                                <span className="text-xs text-muted-foreground">
                                  Run {edge.parentRunId} · size {edge.parentSize}
                                </span>
                              </td>
                              <td className="py-2 pr-4">
                                {formatClusterRef(edge.childClusterId)}<br />
                                <span className="text-xs text-muted-foreground">
                                  Run {edge.childRunId} · size {edge.childSize}
                                </span>
                              </td>
                              <td className="py-2 pr-4">{formatNumber(edge.score)}</td>
                              <td className="py-2 pr-4">
                                {formatNumber(edge.centroidSimilarity)}
                              </td>
                              <td className="py-2 pr-4">
                                {edge.articleOverlapCount} ({formatNumber(edge.articleOverlapRatio)})
                              </td>
                            </tr>
                          );
                        })}

                        {edges.length === 0 && !edgesQuery.isLoading && (
                          <tr>
                            <td colSpan={6} className="py-4 text-muted-foreground">
                              No lineage edges found for the selected pair.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <LineageFlow
                  edges={edges}
                  parentRunId={parentRunId}
                  childRunId={childRunId}
                  selectedEdgeId={selectedEdgeId}
                  onSelectEdge={setSelectedEdgeId}
                />
              </section>

              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Runs
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{runs.length}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Latest run: {latestRun?.runId ?? "—"}
                  </div>
                </div>

                <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Clusters
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {latestRun?.clusterCount ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Noise: {latestRun?.noiseCount ?? "—"}
                  </div>
                </div>

                <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Lineage edges
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {totalVisibleLineageEdges}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Window size: {timelineRunIds.length}
                  </div>
                </div>

                <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Pipeline
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {latestPipelineRun?.status ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(latestPipelineRun?.startedAt ?? null)}
                  </div>
                </div>
              </section>
            </div>

            <LineageRightPanel
              tagLanguage={tagLanguage}
              onChangeTagLanguage={setTagLanguage}
            />
          </section>
        </div>
      </main>

      <EulerDetailModal
        open={selectedEdge !== null && eulerQuery.data !== undefined}
        detail={eulerQuery.data ?? null}
        onClose={() => setSelectedEdgeId(null)}
      />
    </div>
  );
}