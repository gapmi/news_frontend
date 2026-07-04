import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  clusteringKeys,
  getClusterDetail,
  getClusteringRuns,
  getEulerPairDetail,
  getGraphView,
  getLineageEdges,
  getPipelineRuns,
  getSankeyView,
  type LineageEdge,
} from "@/api/clustering";
import { getLineageWindow } from "@/utils/lineageWindow";
import LineageWorkspaceTabs, {
  type CanvasMode,
} from "@/components/lineage/LineageWorkspaceTabs";
import LineageInspectorPane from "@/components/lineage/LineageInspectorPane";

interface SelectedClusterState {
  runId: number;
  clusterId: number;
  label?: string | null;
}

function formatRelativePipelineTime(value: string | null | undefined) {
  if (!value) return "No recent pipeline run";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));

  if (diffMin < 1) return "Updated just now";
  if (diffMin < 60) return `Updated ${diffMin}m ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `Updated ${diffHr}h ago`;

  const diffDay = Math.round(diffHr / 24);
  return `Updated ${diffDay}d ago`;
}

export default function LineageDashboard() {
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("overview");
  const [anchorRunId, setAnchorRunId] = useState<number | null>(null);

  // Два уровня threshold: draft (UI) и applied (для запросов)
  const [appliedMinScore, setAppliedMinScore] = useState<number>(0.42);
  const [draftMinScore, setDraftMinScore] = useState<number>(0.42);

  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);
  const [selectedCluster, setSelectedCluster] =
    useState<SelectedClusterState | null>(null);

  const runsQuery = useQuery({
    queryKey: clusteringKeys.runs({
      limit: 100,
      order: "asc",
    }),
    queryFn: () =>
      getClusteringRuns({
        limit: 100,
        order: "asc",
      }),
    staleTime: 30_000,
  });

  const pipelineRunsQuery = useQuery({
    queryKey: clusteringKeys.pipelineRuns({
      limit: 20,
      jobtype: "clustering",
    }),
    queryFn: () =>
      getPipelineRuns({
        limit: 20,
        jobtype: "clustering",
      }),
    staleTime: 30_000,
  });

  const allRunIds = useMemo(() => {
    const clusteringRunIds = (runsQuery.data?.items ?? [])
      .map((run) => run.runId)
      .filter((value): value is number => Number.isFinite(value));

    const pipelineRunIds = (pipelineRunsQuery.data?.items ?? [])
      .map((run) => run.relatedRunId)
      .filter((value): value is number => Number.isFinite(value));

    return Array.from(new Set([...clusteringRunIds, ...pipelineRunIds])).sort(
      (a, b) => a - b,
    );
  }, [runsQuery.data, pipelineRunsQuery.data]);

  useEffect(() => {
    if (anchorRunId !== null) return;
    if (allRunIds.length === 0) return;
    setAnchorRunId(allRunIds[allRunIds.length - 1]);
  }, [anchorRunId, allRunIds]);

  const lineageWindow = useMemo(() => {
    if (anchorRunId === null || allRunIds.length === 0) return null;
    return getLineageWindow(allRunIds, anchorRunId, 5);
  }, [allRunIds, anchorRunId]);

  const startRunId = lineageWindow?.startRunId ?? anchorRunId ?? 0;
  const endRunId = lineageWindow?.endRunId ?? anchorRunId ?? 0;
  const windowRunIds = lineageWindow?.runIds ?? allRunIds;

  const sankeyQuery = useQuery({
    queryKey:
      startRunId && endRunId
        ? clusteringKeys.sankey({
            start_run_id: startRunId,
            end_run_id: endRunId,
            min_score: appliedMinScore,
          })
        : [...clusteringKeys.all, "views", "sankey", "disabled"],
    queryFn: () =>
      getSankeyView({
        start_run_id: startRunId,
        end_run_id: endRunId,
        min_score: appliedMinScore,
      }),
    enabled: startRunId > 0 && endRunId > 0,
    staleTime: 30_000,
  });

  const graphQuery = useQuery({
    queryKey:
      startRunId && endRunId
        ? clusteringKeys.graph({
            start_run_id: startRunId,
            end_run_id: endRunId,
            min_score: appliedMinScore,
            max_nodes: 120,
            max_edges: 240,
          })
        : [...clusteringKeys.all, "views", "graph", "disabled"],
    queryFn: () =>
      getGraphView({
        start_run_id: startRunId,
        end_run_id: endRunId,
        min_score: appliedMinScore,
        max_nodes: 120,
        max_edges: 240,
      }),
    enabled: startRunId > 0 && endRunId > 0,
    staleTime: 30_000,
  });

  const activePair = useMemo(() => {
    if (selectedEdgeId && sankeyQuery.data?.links) {
      const selectedLink = sankeyQuery.data.links.find(
        (link) => link.edgeId === selectedEdgeId,
      );

      if (selectedLink) {
        const sourceNode = sankeyQuery.data.nodes.find(
          (node) => node.id === selectedLink.source,
        );
        const targetNode = sankeyQuery.data.nodes.find(
          (node) => node.id === selectedLink.target,
        );

        if (sourceNode && targetNode) {
          return {
            parentRunId: sourceNode.runId,
            childRunId: targetNode.runId,
          };
        }
      }
    }

    if (anchorRunId !== null) {
      const anchorIndex = allRunIds.indexOf(anchorRunId);

      if (anchorIndex > 0) {
        return {
          parentRunId: allRunIds[anchorIndex - 1],
          childRunId: anchorRunId,
        };
      }

      if (anchorIndex >= 0 && anchorIndex < allRunIds.length - 1) {
        return {
          parentRunId: anchorRunId,
          childRunId: allRunIds[anchorIndex + 1],
        };
      }
    }

    return null;
  }, [selectedEdgeId, sankeyQuery.data, anchorRunId, allRunIds]);

  const lineageEdgesQuery = useQuery({
    queryKey: activePair
      ? clusteringKeys.lineageEdges({
          parent_run_id: activePair.parentRunId,
          child_run_id: activePair.childRunId,
          min_score: appliedMinScore,
          limit: 500,
          sort: "score_desc",
        })
      : [...clusteringKeys.all, "lineage", "edges", "disabled"],
    queryFn: () =>
      getLineageEdges({
        parent_run_id: activePair!.parentRunId,
        child_run_id: activePair!.childRunId,
        min_score: appliedMinScore,
        limit: 500,
        sort: "score_desc",
      }),
    enabled: !!activePair,
    staleTime: 30_000,
  });

  const activeEdgeIds = useMemo(() => {
    return new Set((lineageEdgesQuery.data?.items ?? []).map((edge) => edge.edgeId));
  }, [lineageEdgesQuery.data]);

  const selectedEdge: LineageEdge | null = useMemo(() => {
    if (!selectedEdgeId) return null;

    return (
      lineageEdgesQuery.data?.items.find((edge) => edge.edgeId === selectedEdgeId) ??
      null
    );
  }, [lineageEdgesQuery.data, selectedEdgeId]);

  const eulerDetailQuery = useQuery({
    queryKey: selectedEdgeId
      ? clusteringKeys.euler(selectedEdgeId)
      : [...clusteringKeys.all, "views", "euler", "disabled"],
    queryFn: () => getEulerPairDetail(selectedEdgeId!),
    enabled: !!selectedEdgeId,
    staleTime: 30_000,
  });

  const clusterDetailQuery = useQuery({
    queryKey: selectedCluster
      ? clusteringKeys.cluster(selectedCluster.clusterId, {
          include_articles: true,
          articles_limit: 100,
          include_radial_map: true,
        })
      : [...clusteringKeys.all, "clusters", "disabled"],
    queryFn: () =>
      getClusterDetail(selectedCluster!.clusterId, {
        include_articles: true,
        articles_limit: 100,
        include_radial_map: true,
      }),
    enabled: !!selectedCluster,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!selectedCluster) return;
    if (!windowRunIds.includes(selectedCluster.runId)) {
      setSelectedCluster(null);
    }
  }, [selectedCluster, windowRunIds]);

  useEffect(() => {
    if (!selectedEdgeId) return;
    if (!selectedEdge) {
      setSelectedEdgeId(null);
    }
  }, [selectedEdgeId, selectedEdge]);

  const latestPipelineRun = pipelineRunsQuery.data?.items?.[0] ?? null;

  const pageError =
    runsQuery.error instanceof Error
      ? runsQuery.error.message
      : pipelineRunsQuery.error instanceof Error
        ? pipelineRunsQuery.error.message
        : sankeyQuery.error instanceof Error
          ? sankeyQuery.error.message
          : graphQuery.error instanceof Error
            ? graphQuery.error.message
            : null;

  // initial loading — только первый заход
  const isInitialPageLoading =
    runsQuery.isLoading ||
    pipelineRunsQuery.isLoading ||
    (anchorRunId !== null &&
      !sankeyQuery.data &&
      !graphQuery.data &&
      (sankeyQuery.isLoading || graphQuery.isLoading));

  // background refetch — без skeleton, с overlay
  const isStageFetching =
    sankeyQuery.isFetching || graphQuery.isFetching || lineageEdgesQuery.isFetching;

  const hasNoRuns =
    !runsQuery.isLoading &&
    !pipelineRunsQuery.isLoading &&
    allRunIds.length === 0;

  return (
    <div className="space-y-5">
      {/* Верхний header (Analysis workspace) */}
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr_auto] xl:items-center">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Lineage workspace
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Cluster lineage analysis
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              One analysis canvas, one inspector, and separate modes for lineage
              overview, pair graph, and overlap detail.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Anchor
              </div>
              <div className="mt-2 text-lg font-semibold">
                {anchorRunId ?? "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Active run focus
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Window
              </div>
              <div className="mt-2 text-lg font-semibold">
                {startRunId && endRunId ? `${startRunId} → ${endRunId}` : "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Story window
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Pipeline
              </div>
              <div className="mt-2 text-lg font-semibold">
                {latestPipelineRun?.status ?? "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatRelativePipelineTime(
                  latestPipelineRun?.finishedAt ?? latestPipelineRun?.startedAt,
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Selection
              </div>
              <div className="mt-2 text-lg font-semibold">
                {selectedCluster ? `C${selectedCluster.clusterId}` : "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Inspector target
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-lg border border-border/70 bg-background px-4 text-sm"
            >
              EN labels
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-lg border border-border/70 bg-background px-4 text-sm"
            >
              Deep link
            </button>
          </div>
        </div>
      </section>

      {pageError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {pageError}
        </div>
      ) : null}

      {hasNoRuns ? (
        <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold tracking-tight">
              No lineage runs available
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The page did not receive any clustering runs from the lineage API or
              related run ids from the pipeline API.
            </p>
            <div className="mt-4 rounded-xl border border-dashed border-border/70 px-4 py-4 text-sm text-muted-foreground">
              Check backend data availability, run filters, and whether pipeline
              runs contain valid relatedRunId values.
            </div>
          </div>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_480px]">
          <div className="space-y-5">
            {isInitialPageLoading ? (
              <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <div className="space-y-4">
                  <div className="h-11 w-[360px] animate-pulse rounded-xl bg-muted/50" />
                  <div className="h-6 w-[280px] animate-pulse rounded-md bg-muted/50" />
                  <div className="h-[640px] animate-pulse rounded-xl border border-border/70 bg-muted/30" />
                </div>
              </section>
            ) : (
              <LineageWorkspaceTabs
                mode={canvasMode}
                onChangeMode={setCanvasMode}
                sankeyData={sankeyQuery.data ?? null}
                graphData={graphQuery.data ?? null}
                eulerDetail={eulerDetailQuery.data ?? null}
                selectedEdge={selectedEdge}
                selectedEdgeId={selectedEdgeId}
                activeEdgeIds={activeEdgeIds}
                focusedRunId={anchorRunId}
                timelineRunIds={windowRunIds}
                anchorRunId={anchorRunId}
                minScore={draftMinScore}
                appliedMinScore={appliedMinScore}
                isFetching={isStageFetching}
                onSelectRun={(runId) => {
                  setAnchorRunId(runId);
                }}
                onChangeMinScoreDraft={(value) => {
                  setDraftMinScore(value);
                }}
                onCommitMinScore={(value) => {
                  setDraftMinScore(value);
                  setAppliedMinScore(value);
                }}
                onSelectEdge={(edgeId) => {
                  setSelectedEdgeId(edgeId);
                  setCanvasMode("overlap");
                }}
                onSelectCluster={(runId, clusterId, label) => {
                  setSelectedCluster({ runId, clusterId, label });
                }}
              />
            )}
          </div>

          <LineageInspectorPane
            selectedCluster={selectedCluster}
            clusterDetail={clusterDetailQuery.data ?? null}
            selectedEdge={selectedEdge}
            eulerDetail={eulerDetailQuery.data ?? null}
            isLoadingCluster={clusterDetailQuery.isLoading}
            clusterError={
              clusterDetailQuery.error instanceof Error
                ? clusterDetailQuery.error.message
                : null
            }
            onCloseCluster={() => setSelectedCluster(null)}
          />
        </div>
      )}
    </div>
  );
}