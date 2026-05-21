import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  clusteringKeys,
  getClusteringRuns,
  getEulerPairDetail,
  getLineageEdges,
  getPipelineRuns,
  type LineageEdge,
} from "@/api/clustering";
import LineageFlow from "@/components/charts/LineageFlow";
import EulerOverlapDiagram from "@/components/charts/EulerOverlapDiagram";

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

type RunPair = {
  parentRunId: number;
  childRunId: number;
};

export default function LineageDashboard() {
  const [manualParentRunId, setManualParentRunId] = useState<number | null>(null);
  const [manualChildRunId, setManualChildRunId] = useState<number | null>(null);
  const [pairIndex, setPairIndex] = useState<number>(0);
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

  const availablePairs = useMemo<RunPair[]>(() => {
    if (sortedLineageRunIds.length < 2) {
      return [];
    }

    return sortedLineageRunIds
      .slice(0, -1)
      .map((parentRunId, index) => ({
        parentRunId,
        childRunId: sortedLineageRunIds[index + 1],
      }))
      .filter((pair) => pair.parentRunId < pair.childRunId);
  }, [sortedLineageRunIds]);

  useEffect(() => {
    if (availablePairs.length === 0) {
      setPairIndex(0);
      return;
    }

    setPairIndex((current) => Math.min(current, availablePairs.length - 1));
  }, [availablePairs]);

  const activePair = availablePairs[pairIndex] ?? null;

  const parentOptions = useMemo(() => {
    return [...new Set(availablePairs.map((pair) => pair.parentRunId))];
  }, [availablePairs]);

  const parentRunId = manualParentRunId ?? activePair?.parentRunId ?? null;

  const childOptions = useMemo(() => {
    if (parentRunId === null) {
      return [];
    }

    return availablePairs
      .filter((pair) => pair.parentRunId === parentRunId)
      .map((pair) => pair.childRunId);
  }, [availablePairs, parentRunId]);

  const childRunHelperText = useMemo(() => {
    if (parentRunId === null) {
      return "Choose a parent run to see valid child runs";
    }

    if (childOptions.length === 0) {
      return `No valid child runs for parent ${parentRunId}`;
    }

    return `Available for parent ${parentRunId}: ${childOptions.join(", ")}`;
  }, [parentRunId, childOptions]);

  const childRunId = useMemo(() => {
    if (manualChildRunId !== null && childOptions.includes(manualChildRunId)) {
      return manualChildRunId;
    }

    if (
      activePair &&
      activePair.parentRunId === parentRunId &&
      childOptions.includes(activePair.childRunId)
    ) {
      return activePair.childRunId;
    }

    return childOptions[0] ?? null;
  }, [manualChildRunId, childOptions, activePair, parentRunId]);

  useEffect(() => {
    if (parentRunId === null) {
      setManualChildRunId(null);
      return;
    }

    if (childOptions.length === 0) {
      setManualChildRunId(null);
      return;
    }

    if (childRunId === null || !childOptions.includes(childRunId)) {
      setManualChildRunId(childOptions[0]);
    }
  }, [parentRunId, childOptions, childRunId]);

  useEffect(() => {
    if (parentRunId === null || childRunId === null) {
      return;
    }

    const nextIndex = availablePairs.findIndex(
      (pair) =>
        pair.parentRunId === parentRunId &&
        pair.childRunId === childRunId,
    );

    if (nextIndex >= 0) {
      setPairIndex(nextIndex);
    }
  }, [availablePairs, parentRunId, childRunId]);

  const edgeParams =
    parentRunId !== null &&
    childRunId !== null &&
    parentRunId < childRunId &&
    childOptions.includes(childRunId)
      ? {
          parent_run_id: parentRunId,
          child_run_id: childRunId,
          min_score: minScore,
          limit: 50,
        }
      : null;

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

  const canStepBackward = availablePairs.length > 0 && pairIndex > 0;
  const canStepForward =
    availablePairs.length > 0 && pairIndex < availablePairs.length - 1;

  function stepToPair(nextIndex: number) {
    const boundedIndex = Math.max(0, Math.min(nextIndex, availablePairs.length - 1));
    const nextPair = availablePairs[boundedIndex];

    if (!nextPair) {
      return;
    }

    setPairIndex(boundedIndex);
    setManualParentRunId(null);
    setManualChildRunId(null);
    setSelectedEdgeId(null);
  }

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
              Parent run
              <select
                className="rounded-md border bg-background px-3 py-2"
                value={parentRunId ?? ""}
                onChange={(event) => {
                  const nextParentRunId = Number(event.target.value);
                  const nextChildOptions = availablePairs
                    .filter((pair) => pair.parentRunId === nextParentRunId)
                    .map((pair) => pair.childRunId);

                  setManualParentRunId(nextParentRunId);
                  setManualChildRunId(nextChildOptions[0] ?? null);
                  setSelectedEdgeId(null);
                }}
              >
                {parentOptions.map((runId) => (
                  <option key={runId} value={runId}>
                    Run {runId}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Child run
              <select
                className="rounded-md border bg-background px-3 py-2"
                value={childRunId ?? ""}
                onChange={(event) => {
                  setManualChildRunId(Number(event.target.value));
                  setSelectedEdgeId(null);
                }}
                disabled={childOptions.length === 0}
                aria-describedby="child-run-helper"
              >
                {childOptions.map((runId) => (
                  <option key={runId} value={runId}>
                    Run {runId}
                  </option>
                ))}
              </select>

              <span
                id="child-run-helper"
                className="text-xs text-muted-foreground"
              >
                {childRunHelperText}
              </span>
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
              {parentRunId !== null && childRunId !== null ? (
                <div className="space-y-1">
                  <div>{`Selected pair: ${parentRunId} → ${childRunId}`}</div>

                  {edgesQuery.isLoading ? (
                    <div className="text-xs text-muted-foreground">
                      Loading edges for selected pair...
                    </div>
                  ) : edgesQuery.error ? (
                    <div className="text-xs text-red-600">
                      Failed to load edges for selected pair
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {`Edges for pair: ${pairEdgeCount}`}
                    </div>
                  )}
                </div>
              ) : (
                "No valid lineage pair available"
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

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => stepToPair(pairIndex - 1)}
              disabled={!canStepBackward}
            >
              Previous pair
            </button>

            <button
              type="button"
              className="rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => stepToPair(pairIndex + 1)}
              disabled={!canStepForward}
            >
              Next pair
            </button>

            <div className="flex items-center text-sm text-muted-foreground">
              {availablePairs.length > 0
                ? `Pair ${pairIndex + 1} of ${availablePairs.length}`
                : "No adjacent lineage pairs available"}
            </div>
          </div>
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
                        No lineage edges found for this pair and score threshold.
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
        <div className="mt-6">
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