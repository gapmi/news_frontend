import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  clusteringKeys,
  getClusteringRuns,
  getEulerPairDetail,
  getGraphView,
  getLineageEdges,
  getPipelineRuns,
  getSankeyView,
  type LineageEdge,
} from "@/api/clustering";
import RunTimelineSlider from "@/components/lineage/RunTimelineSlider";
import LineageRightPanel from "@/components/lineage/LineageRightPanel";
import EulerDetailModal from "@/components/lineage/EulerDetailModal";
import MultiRunSankey from "@/components/charts/MultiRunSankey";
import LineageFlow from "@/components/charts/LineageFlow";
import LineagePageShell from "@/components/lineage/page/LineagePageShell";
import AnalyticsSection from "@/components/lineage/page/AnalyticsSection";
import DashboardPageHeader from "@/components/lineage/page/DashboardPageHeader";
import SectionState from "@/components/lineage/page/SectionState";
import { getLineageWindow } from "@/utils/lineageWindow";

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

function MetricCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string | number;
  meta: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
    </div>
  );
}

export default function LineageDashboard() {
  const [manualParentRunId, setManualParentRunId] = useState<number | null>(null);
  const [manualChildRunId, setManualChildRunId] = useState<number | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);
  const [tagLanguage, setTagLanguage] = useState<"RU" | "EN">("RU");
  const [viewMode, setViewMode] = useState<"sankey" | "graph">("graph");
  const [selectedCluster, setSelectedCluster] = useState<{
    runId: number;
    clusterId: number;
    label?: string | null;
  } | null>(null);

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

  function handleSelectCluster(runId: number, clusterId: number, label?: string | null) {
    setSelectedCluster({ runId, clusterId, label: label ?? null });
  }

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

  useEffect(() => {
    setSelectedCluster(null);
  }, [parentRunId, childRunId, minScore]);

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

  const graphParams = sankeyWindow
    ? {
        start_run_id: sankeyWindow.startRunId,
        end_run_id: sankeyWindow.endRunId,
        min_score: minScore,
        max_nodes: 180,
        max_edges: 220,
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

  const graphQuery = useQuery({
    queryKey: graphParams
      ? clusteringKeys.graph(graphParams)
      : clusteringKeys.graph({ start_run_id: 0, end_run_id: 0 }),
    queryFn: () => getGraphView(graphParams!),
    enabled: Boolean(graphParams),
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
      ? "Cluster lineage analysis"
      : "Lineage overview";

  const storySubtitle =
    latestPipelineRun?.status
      ? `Latest pipeline run: ${latestPipelineRun.status}. Last start: ${formatDateTime(
          latestPipelineRun.startedAt,
        )}.`
      : "Track storyline flow across adjacent lineage runs and inspect overlap on demand.";

  const clusterLabelByRef = useMemo(() => {
    const map = new Map<string, string>();

    for (const node of graphQuery.data?.nodes ?? []) {
      const label =
        (typeof node.meta?.nameShort === "string" && node.meta.nameShort.trim()) ||
        (typeof node.label === "string" && node.label.trim()) ||
        "";

      map.set(`${node.runId}:${node.clusterId}`, label);
    }

    return map;
  }, [graphQuery.data]);

  function getClusterTag(runId: number, clusterId: number) {
    return clusterLabelByRef.get(`${runId}:${clusterId}`) ?? "";
  }

  function formatClusterTitle(clusterId: number, tag: string) {
    return tag ? `${tag} · C${clusterId}` : `C${clusterId}`;
  }

  return (
    <LineagePageShell>
      <DashboardPageHeader
        title={storyTitle}
        subtitle={storySubtitle}
        parentRunId={parentRunId}
        childRunId={childRunId}
        windowStartRunId={sankeyWindow?.startRunId ?? null}
        windowEndRunId={sankeyWindow?.endRunId ?? null}
        pipelineStatus={latestPipelineRun?.status ?? null}
      />

      <AnalyticsSection
        title="Controls"
        description="Select the active anchor run, pair window, score threshold, and current graph mode."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border bg-background p-1 text-xs">
              <button
                type="button"
                className={
                  viewMode === "sankey"
                    ? "rounded-md bg-primary px-3 py-1.5 text-primary-foreground"
                    : "px-3 py-1.5 text-muted-foreground"
                }
                onClick={() => setViewMode("sankey")}
              >
                Sankey
              </button>
              <button
                type="button"
                className={
                  viewMode === "graph"
                    ? "rounded-md bg-primary px-3 py-1.5 text-primary-foreground"
                    : "px-3 py-1.5 text-muted-foreground"
                }
                onClick={() => setViewMode("graph")}
              >
                Graph
              </button>
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
                  setSelectedCluster(null);
                }}
              />
            </label>
          </div>
        }
      >
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
            setSelectedCluster(null);
          }}
        />
      </AnalyticsSection>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <div className="space-y-6">
          <AnalyticsSection
            title={viewMode === "sankey" ? "Lineage flow" : "Semantic map"}
            description={
              viewMode === "sankey"
                ? `Runs ${sankeyWindow?.startRunId ?? "—"} → ${sankeyWindow?.endRunId ?? "—"}`
                : `Anchor run ${parentRunId ?? "—"} · Pair ${parentRunId ?? "—"} → ${childRunId ?? "—"}`
            }
          >
            {viewMode === "sankey" ? (
              !sankeyParams ? (
                <SectionState kind="empty" title="No lineage window selected" />
              ) : sankeyQuery.isLoading && !sankeyQuery.data ? (
                <SectionState kind="loading" title="Loading Sankey data" />
              ) : sankeyQuery.error ? (
                <SectionState
                  kind="error"
                  title="Failed to load Sankey"
                  message={(sankeyQuery.error as Error).message}
                />
              ) : sankeyQuery.data ? (
                <MultiRunSankey
                  data={sankeyQuery.data}
                  selectedEdgeId={selectedEdgeId}
                  onSelectEdge={setSelectedEdgeId}
                />
              ) : (
                <SectionState kind="empty" title="No Sankey data available" />
              )
            ) : !graphParams ? (
              <SectionState kind="empty" title="No graph window selected" />
            ) : graphQuery.isLoading && !graphQuery.data ? (
              <SectionState kind="loading" title="Loading semantic graph" />
            ) : graphQuery.error ? (
              <SectionState
                kind="error"
                title="Failed to load semantic graph"
                message={(graphQuery.error as Error).message}
              />
            ) : graphQuery.data ? (
              <LineageFlow
                data={graphQuery.data}
                selectedEdgeId={selectedEdgeId}
                onSelectEdge={setSelectedEdgeId}
                onSelectCluster={handleSelectCluster}
              />
            ) : (
              <SectionState kind="empty" title="No graph data available" />
            )}
          </AnalyticsSection>

          <AnalyticsSection
            title="Lineage inspection"
            description={`Detailed parent/child edge pairs for run ${parentRunId ?? "—"} → ${childRunId ?? "—"}`}
          >
            {edgesQuery.error ? (
              <SectionState
                kind="error"
                title="Failed to load lineage edges"
                message={(edgesQuery.error as Error).message}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4 font-medium">Edge</th>
                      <th className="py-2 pr-4 font-medium">Parent</th>
                      <th className="py-2 pr-4 font-medium">Child</th>
                      <th className="py-2 pr-4 font-medium">Score</th>
                      <th className="py-2 pr-4 font-medium">Similarity</th>
                      <th className="py-2 pr-4 font-medium">Overlap</th>
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
                          <td className="py-3 pr-4 align-top">{edge.edgeId}</td>

                          <td className="py-3 pr-4 align-top">
                            <div className="font-medium">
                              {formatClusterTitle(
                                edge.parentClusterId,
                                getClusterTag(edge.parentRunId, edge.parentClusterId),
                              )}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Run {edge.parentRunId} · size {edge.parentSize}
                            </div>
                          </td>

                          <td className="py-3 pr-4 align-top">
                            <div className="font-medium">
                              {formatClusterTitle(
                                edge.childClusterId,
                                getClusterTag(edge.childRunId, edge.childClusterId),
                              )}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Run {edge.childRunId} · size {edge.childSize}
                            </div>
                          </td>

                          <td className="py-3 pr-4 align-top">{formatNumber(edge.score)}</td>
                          <td className="py-3 pr-4 align-top">
                            {formatNumber(edge.centroidSimilarity)}
                          </td>
                          <td className="py-3 pr-4 align-top">
                            {edge.articleOverlapCount} ({formatNumber(edge.articleOverlapRatio)})
                          </td>
                        </tr>
                      );
                    })}

                    {edgesQuery.isLoading && edges.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-sm text-muted-foreground">
                          Loading lineage edges…
                        </td>
                      </tr>
                    )}

                    {!edgesQuery.isLoading && edges.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-sm text-muted-foreground">
                          No lineage edges found for the selected pair.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </AnalyticsSection>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Runs"
              value={runs.length}
              meta={`Latest run: ${latestRun?.runId ?? "—"}`}
            />
            <MetricCard
              label="Clusters"
              value={latestRun?.clusterCount ?? "—"}
              meta={`Noise: ${latestRun?.noiseCount ?? "—"}`}
            />
            <MetricCard
              label="Lineage edges"
              value={totalVisibleLineageEdges}
              meta={`Window size: ${timelineRunIds.length}`}
            />
            <MetricCard
              label="Pipeline"
              value={latestPipelineRun?.status ?? "—"}
              meta={formatDateTime(latestPipelineRun?.startedAt ?? null)}
            />
          </section>
        </div>

        <div className="space-y-6">
          <AnalyticsSection
            title="Context"
            description="Secondary controls and selection context for the current lineage window."
            contentClassName="space-y-5"
          >
            <LineageRightPanel
              tagLanguage={tagLanguage}
              onChangeTagLanguage={setTagLanguage}
            />

            <div className="rounded-xl border bg-background px-4 py-4">
              <h3 className="text-sm font-semibold">Selected cluster</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Preserved graph interaction debug context.
              </p>

              {selectedCluster ? (
                <div className="mt-4 space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Run:</span>{" "}
                    {selectedCluster.runId}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cluster:</span>{" "}
                    C{selectedCluster.clusterId}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Label:</span>{" "}
                    {selectedCluster.label ?? "—"}
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-muted-foreground">
                  No cluster selected.
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-background px-4 py-4">
              <h3 className="text-sm font-semibold">Selected edge</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Current edge selection synchronized with Sankey, graph, table, and Euler detail.
              </p>

              {selectedEdge ? (
                <div className="mt-4 space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Edge:</span>{" "}
                    {selectedEdge.edgeId}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pair:</span>{" "}
                    {selectedEdge.parentRunId}:{selectedEdge.parentClusterId} →{" "}
                    {selectedEdge.childRunId}:{selectedEdge.childClusterId}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Score:</span>{" "}
                    {formatNumber(selectedEdge.score)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Overlap:</span>{" "}
                    {selectedEdge.articleOverlapCount} (
                    {formatNumber(selectedEdge.articleOverlapRatio)})
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-muted-foreground">
                  No edge selected.
                </div>
              )}
            </div>
          </AnalyticsSection>
        </div>
      </section>

      <EulerDetailModal
        open={selectedEdge !== null && eulerQuery.data !== undefined}
        detail={eulerQuery.data ?? null}
        onClose={() => setSelectedEdgeId(null)}
      />
    </LineagePageShell>
  );
}