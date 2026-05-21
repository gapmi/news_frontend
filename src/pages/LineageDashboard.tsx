import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  clusteringKeys,
  getClusteringRuns,
  getEulerPairDetail,
  getLineageEdges,
  getPipelineRuns,
  getSankeyView,
  type LineageEdge,
} from "@/api/clustering";
import LineageFlow from "@/components/charts/LineageFlow";
import EulerOverlapDiagram from "@/components/charts/EulerOverlapDiagram";
import MultiRunSankey from "@/components/charts/MultiRunSankey";

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

interface RunRange {
  startRunId: number;
  endRunId: number;
}

export default function LineageDashboard() {
  const [manualStartRunId, setManualStartRunId] = useState<number | null>(null);
  const [manualEndRunId, setManualEndRunId] = useState<number | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);

  const runsQuery = useQuery({
    queryKey: clusteringKeys.runs({ status: "success", limit: 12 }),
    queryFn: () => getClusteringRuns({ status: "success", limit: 12 }),
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

  const defaultRange = useMemo<RunRange | null>(() => {
    if (sortedLineageRunIds.length < 2) {
      return null;
    }

    return {
      startRunId: sortedLineageRunIds[0],
      endRunId: sortedLineageRunIds[sortedLineageRunIds.length - 1],
    };
  }, [sortedLineageRunIds]);

  const startRunId = manualStartRunId ?? defaultRange?.startRunId ?? null;
  const endRunId = manualEndRunId ?? defaultRange?.endRunId ?? null;

  const isValidRange =
    startRunId !== null &&
    endRunId !== null &&
    startRunId < endRunId;

  useEffect(() => {
    if (
      manualStartRunId !== null &&
      manualEndRunId !== null &&
      manualStartRunId >= manualEndRunId
    ) {
      const nextEndRunId = sortedLineageRunIds.find(
        (runId) => runId > manualStartRunId,
      );
      setManualEndRunId(nextEndRunId ?? null);
    }
  }, [manualStartRunId, manualEndRunId, sortedLineageRunIds]);

  const rangeRunIds = useMemo(() => {
    if (!isValidRange || startRunId === null || endRunId === null) {
      return [];
    }

    return sortedLineageRunIds.filter(
      (runId) => runId >= startRunId && runId <= endRunId,
    );
  }, [isValidRange, startRunId, endRunId, sortedLineageRunIds]);

  const pairOptions = useMemo(() => {
    if (rangeRunIds.length < 2) {
      return [];
    }

    return rangeRunIds.slice(0, -1).map((parentRunId, index) => ({
      parentRunId,
      childRunId: rangeRunIds[index + 1],
    }));
  }, [rangeRunIds]);

  const activePair = pairOptions[pairOptions.length - 1] ?? null;
  const parentRunId = activePair?.parentRunId ?? null;
  const childRunId = activePair?.childRunId ?? null;

  const sankeyParams =
    isValidRange && startRunId !== null && endRunId !== null
      ? {
          start_run_id: startRunId,
          end_run_id: endRunId,
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

  const totalVisibleLineageEdges = useMemo(() => {
    return runs.reduce((sum, run) => sum + run.parentLineageEdgeCount, 0);
  }, [runs]);

  const edges = edgesQuery.data?.items ?? [];
  const pairEdgeCount = edges.length;

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.edgeId === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const selectedParentLabel = eulerQuery.data?.parent.label ?? null;
  const selectedChildLabel = eulerQuery.data?.child.label ?? null;

  const endRunOptions = useMemo(() => {
    if (startRunId === null) {
      return sortedLineageRunIds;
    }

    return sortedLineageRunIds.filter((runId) => runId > startRunId);
  }, [sortedLineageRunIds, startRunId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 border-b pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                News Market Lineage Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Explore cluster evolution across runs with Sankey flow, graph topology,
                Euler overlap detail, run quality metrics, and pipeline health.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Runs
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {runsQuery.isLoading ? "…" : runs.length}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Latest run: {latestRun?.runId ?? "—"}
                </div>
              </div>

              <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Clusters
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {latestRun ? latestRun.clusterCount : "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Noise: {latestRun ? latestRun.noiseCount : "—"}
                </div>
              </div>

              <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Lineage edges
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {runsQuery.isLoading ? "…" : totalVisibleLineageEdges}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Runs with lineage: {lineageRuns.length}
                </div>
              </div>

              <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Pipeline status
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {latestPipelineRun?.status ?? "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Last start: {formatDateTime(latestPipelineRun?.startedAt ?? null)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-medium">Controls</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm">
              Start run
              <select
                className="rounded-md border bg-background px-3 py-2"
                value={startRunId ?? ""}
                onChange={(event) => {
                  setManualStartRunId(Number(event.target.value));
                  setSelectedEdgeId(null);
                }}
              >
                {sortedLineageRunIds.map((runId) => (
                  <option key={runId} value={runId}>
                    Run {runId}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              End run
              <select
                className="rounded-md border bg-background px-3 py-2"
                value={endRunId ?? ""}
                onChange={(event) => {
                  setManualEndRunId(Number(event.target.value));
                  setSelectedEdgeId(null);
                }}
                disabled={endRunOptions.length === 0}
              >
                {endRunOptions.map((runId) => (
                  <option key={runId} value={runId}>
                    Run {runId}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Min score
              <input
                className="rounded-md border bg-background px-3 py-2"
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

            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {isValidRange && startRunId !== null && endRunId !== null ? (
                <div className="space-y-1">
                  <div>{`Selected range: ${startRunId} → ${endRunId}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {`Runs in range: ${rangeRunIds.length}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activePair
                      ? `Detail pair: ${activePair.parentRunId} → ${activePair.childRunId}`
                      : "No adjacent pair inside range"}
                  </div>
                  {edgesQuery.isLoading ? (
                    <div className="text-xs text-muted-foreground">
                      Loading edges for detail pair...
                    </div>
                  ) : edgesQuery.error ? (
                    <div className="text-xs text-red-600">
                      Failed to load edges for detail pair
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {`Edges for detail pair: ${pairEdgeCount}`}
                    </div>
                  )}
                </div>
              ) : (
                "No valid lineage range available"
              )}
            </div>
          </div>

          {selectedEdge && (
            <div className="mt-4 rounded-lg border bg-background px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Selected lineage edge
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-sm font-medium">Parent cluster</div>
                  <div className="text-sm text-muted-foreground">
                    {formatClusterRef(selectedEdge.parentClusterId, selectedParentLabel)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Run {selectedEdge.parentRunId} · size {selectedEdge.parentSize}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium">Child cluster</div>
                  <div className="text-sm text-muted-foreground">
                    {formatClusterRef(selectedEdge.childClusterId, selectedChildLabel)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Run {selectedEdge.childRunId} · size {selectedEdge.childSize}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-medium">Multi-run lineage</h2>

          {sankeyQuery.isLoading && (
            <p className="mt-3 text-sm text-muted-foreground">Loading Sankey...</p>
          )}

          {sankeyQuery.error && (
            <p className="mt-3 text-sm text-red-600">
              {(sankeyQuery.error as Error).message}
            </p>
          )}

          {sankeyQuery.data && (
            <>
              <div className="mt-3 text-sm text-muted-foreground">
                Nodes: {sankeyQuery.data.stats?.nodeCount ?? "—"} · Links:{" "}
                {sankeyQuery.data.stats?.linkCount ?? "—"} · Runs:{" "}
                {sankeyQuery.data.stats?.runCount ?? "—"}
              </div>

              <div className="mt-4">
                <MultiRunSankey
                  data={sankeyQuery.data}
                  selectedEdgeId={selectedEdgeId}
                  onSelectEdge={setSelectedEdgeId}
                />
              </div>
            </>
          )}

          {!sankeyQuery.isLoading && !sankeyQuery.error && !sankeyQuery.data && (
            <p className="mt-3 text-sm text-muted-foreground">
              No Sankey data for this range.
            </p>
          )}
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-medium">Lineage table</h2>

            {edgesQuery.isLoading && (
              <p className="mt-3 text-sm text-muted-foreground">
                Loading lineage edges...
              </p>
            )}

            {edgesQuery.error && (
              <p className="mt-3 text-sm text-red-600">
                {(edgesQuery.error as Error).message}
              </p>
            )}

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
                    const parentLabel =
                      isSelected ? (eulerQuery.data?.parent.label ?? null) : null;
                    const childLabel =
                      isSelected ? (eulerQuery.data?.child.label ?? null) : null;

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
                        <td className="py-2 pr-4 align-top">{edge.edgeId}</td>
                        <td className="py-2 pr-4">
                          <div className="font-medium">
                            {formatClusterRef(edge.parentClusterId, parentLabel)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Run {edge.parentRunId} · size {edge.parentSize}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <div className="font-medium">
                            {formatClusterRef(edge.childClusterId, childLabel)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Run {edge.childRunId} · size {edge.childSize}
                          </div>
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
                      <td
                        colSpan={6}
                        className="py-4 text-sm text-muted-foreground"
                      >
                        No lineage edges found for the active detail pair and score threshold.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-medium">Euler detail</h2>

            {!selectedEdgeId && (
              <p className="mt-3 text-sm text-muted-foreground">
                Click a lineage edge to inspect overlap between the parent and child
                clusters.
              </p>
            )}

            {eulerQuery.isLoading && (
              <p className="mt-3 text-sm text-muted-foreground">
                Loading Euler detail...
              </p>
            )}

            {eulerQuery.error && (
              <p className="mt-3 text-sm text-red-600">
                {(eulerQuery.error as Error).message}
              </p>
            )}

            {eulerQuery.data && (
              <div className="mt-4">
                <EulerOverlapDiagram detail={eulerQuery.data} />
              </div>
            )}
          </div>

          <div className="mt-6 xl:col-span-2">
            <LineageFlow
              edges={edges}
              parentRunId={parentRunId}
              childRunId={childRunId}
              selectedEdgeId={selectedEdgeId}
              onSelectEdge={setSelectedEdgeId}
            />
          </div>
        </section>
      </main>
    </div>
  );
}