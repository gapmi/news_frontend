import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  clusteringKeys,
  getClusterDetail,
  getClusteringRuns,
  getEulerPairDetail,
  getGraphView,
  getLineageEdges,
  getPipelineRuns,
  getSankeyView,
} from "@/api/clustering";
import LineageEdgesSection from "@/components/lineage/LineageEdgesSection";
import LineageContextPanel from "@/components/lineage/LineageContextPanel";
import LineageControlsSection from "@/components/lineage/LineageControlsSection";
import ClusterArticlesDrawer from "@/components/lineage/ClusterArticlesDrawer";
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

interface SelectedClusterState {
  runId: number;
  clusterId: number;
  label?: string | null;
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
    <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{meta}</div>
    </div>
  );
}

function SectionMetaChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{label}:</span>{" "}
      <span>{value}</span>
    </div>
  );
}

export default function LineageDashboard() {
  const [manualParentRunId, setManualParentRunId] = useState<number | null>(null);
  const [manualChildRunId, setManualChildRunId] = useState<number | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);
  const [tagLanguage, setTagLanguage] = useState<"RU" | "EN">("RU");
  const [selectedCluster, setSelectedCluster] = useState<SelectedClusterState | null>(null);

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

  const clusterDetailQuery = useQuery({
    queryKey: selectedCluster
      ? clusteringKeys.cluster(selectedCluster.clusterId, {
          include_articles: true,
          articles_limit: 100,
        })
      : clusteringKeys.cluster(0, {
          include_articles: true,
          articles_limit: 100,
        }),
    queryFn: () =>
      getClusterDetail(selectedCluster!.clusterId, {
        include_articles: true,
        articles_limit: 100,
      }),
    enabled: selectedCluster !== null,
  });

  const edges = edgesQuery.data?.items ?? [];
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.edgeId === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const totalVisibleLineageEdges = useMemo(() => {
    return runs.reduce((sum, run) => sum + run.parentLineageEdgeCount, 0);
  }, [runs]);

  const pageTitle =
    latestRun?.clusterCount
      ? "Cluster lineage analysis"
      : "Lineage overview";

  const pageSubtitle =
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
    <>
      <LineagePageShell>
        <DashboardPageHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          parentRunId={parentRunId}
          childRunId={childRunId}
          windowStartRunId={sankeyWindow?.startRunId ?? null}
          windowEndRunId={sankeyWindow?.endRunId ?? null}
          pipelineStatus={latestPipelineRun?.status ?? null}
        />

        <LineageControlsSection
          minScore={minScore}
          onChangeMinScore={(value) => {
            setMinScore(value);
            setSelectedEdgeId(null);
            setSelectedCluster(null);
          }}
          timelineRunIds={timelineRunIds}
          parentRunId={parentRunId}
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

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <div className="space-y-6">
            <AnalyticsSection
              title="Lineage flow"
              description="Multi-run overview of lineage transitions across the active window."
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <SectionMetaChip
                    label="Window"
                    value={
                      sankeyWindow
                        ? `${sankeyWindow.startRunId} → ${sankeyWindow.endRunId}`
                        : "—"
                    }
                  />
                  <SectionMetaChip
                    label="Min score"
                    value={formatNumber(minScore)}
                  />
                  <SectionMetaChip
                    label="Selected edge"
                    value={selectedEdge ? `#${selectedEdge.edgeId}` : "None"}
                  />
                </div>
              }
            >
              {!sankeyParams ? (
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
                  onSelectCluster={handleSelectCluster}
                />
              ) : (
                <SectionState kind="empty" title="No Sankey data available" />
              )}
            </AnalyticsSection>

            <AnalyticsSection
              title="Semantic map"
              description="Preserved cluster topology workspace for cluster and edge exploration."
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <SectionMetaChip
                    label="Anchor"
                    value={parentRunId !== null ? String(parentRunId) : "—"}
                  />
                  <SectionMetaChip
                    label="Pair"
                    value={
                      parentRunId !== null && childRunId !== null
                        ? `${parentRunId} → ${childRunId}`
                        : "—"
                    }
                  />
                  <SectionMetaChip
                    label="Cluster focus"
                    value={selectedCluster ? `C${selectedCluster.clusterId}` : "None"}
                  />
                </div>
              }
            >
              {!graphParams ? (
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

            <LineageEdgesSection
              edges={edges}
              isLoading={edgesQuery.isLoading}
              error={edgesQuery.error ? (edgesQuery.error as Error).message : null}
              selectedEdgeId={selectedEdgeId}
              onSelectEdge={setSelectedEdgeId}
              parentRunId={parentRunId}
              childRunId={childRunId}
              getClusterTag={getClusterTag}
              formatClusterTitle={formatClusterTitle}
              formatNumber={formatNumber}
            />

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
            <LineageContextPanel
              tagLanguage={tagLanguage}
              onChangeTagLanguage={setTagLanguage}
              selectedCluster={selectedCluster}
              selectedEdge={selectedEdge}
              formatNumber={formatNumber}
            />
          </div>
        </section>

        <EulerDetailModal
          open={selectedEdge !== null && eulerQuery.data !== undefined}
          detail={eulerQuery.data ?? null}
          onClose={() => setSelectedEdgeId(null)}
        />
      </LineagePageShell>

      <ClusterArticlesDrawer
        open={selectedCluster !== null}
        selectedCluster={selectedCluster}
        detail={clusterDetailQuery.data ?? null}
        isLoading={clusterDetailQuery.isLoading}
        error={clusterDetailQuery.error ? (clusterDetailQuery.error as Error).message : null}
        onClose={() => setSelectedCluster(null)}
      />
    </>
  );
}