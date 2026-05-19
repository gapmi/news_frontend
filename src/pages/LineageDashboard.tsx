import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  clusteringKeys,
  getClusteringRuns,
  getEulerPairDetail,
  getLineageEdges,
  getPipelineRuns,
  type LineageEdge,
} from "@/api/clustering";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

export default function LineageDashboard() {
  const [manualParentRunId, setManualParentRunId] = useState<number | null>(
    null,
  );
  const [manualChildRunId, setManualChildRunId] = useState<number | null>(null);
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

  // Находим минимальный и максимальный runId среди runs с lineage
  const defaultPair = useMemo(() => {
    if (lineageRuns.length === 0) {
      return null;
    }
    const ids = lineageRuns.map((run) => run.runId);
    const minId = Math.min(...ids);
    const maxId = Math.max(...ids);
    if (minId >= maxId) {
      return null;
    }
    return {
      parentRunId: minId,
      childRunId: minId + 1,
    };
  }, [lineageRuns]);

  const parentRunId = manualParentRunId ?? defaultPair?.parentRunId ?? null;
  const childRunId = manualChildRunId ?? defaultPair?.childRunId ?? null;

  const edgeParams =
    parentRunId && childRunId && parentRunId < childRunId
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
                Explore cluster evolution across runs with Sankey flow, graph
                topology, Euler overlap detail, run quality metrics, and
                pipeline health.
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
                  Last start: {formatDateTime(
                    latestPipelineRun?.startedAt ?? null,
                  )}
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
                  setManualParentRunId(Number(event.target.value));
                  setSelectedEdgeId(null);
                }}
              >
                {runs.map((run) => (
                  <option key={run.runId} value={run.runId}>
                    Run {run.runId}
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
              >
                {runs.map((run) => (
                  <option key={run.runId} value={run.runId}>
                    Run {run.runId}
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
              {parentRunId && childRunId ? (
                <div className="space-y-1">
                  <div>{`Selected pair: ${parentRunId} → ${childRunId}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {parentRunId < childRunId
                      ? "Lineage table shows edges between these runs"
                      : "Choose a child run greater than the parent run"}
                  </div>
                </div>
              ) : (
                "No lineage pair available"
              )}
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
                  {edges.map((edge: LineageEdge) => (
                    <tr
                      key={edge.edgeId}
                      className="cursor-pointer border-b hover:bg-muted/50"
                      onClick={() => setSelectedEdgeId(edge.edgeId)}
                    >
                      <td className="py-2 pr-4">{edge.edgeId}</td>
                      <td className="py-2 pr-4">
                        Run {edge.parentRunId} / Cluster {edge.parentClusterId}
                      </td>
                      <td className="py-2 pr-4">
                        Run {edge.childRunId} / Cluster {edge.childClusterId}
                      </td>
                      <td className="py-2 pr-4">
                        {formatNumber(edge.score)}
                      </td>
                      <td className="py-2 pr-4">
                        {formatNumber(edge.centroidSimilarity)}
                      </td>
                      <td className="py-2 pr-4">
                        {edge.articleOverlapCount} (
                        {formatNumber(edge.articleOverlapRatio)})
                      </td>
                    </tr>
                  ))}
                  {edges.length === 0 && !edgesQuery.isLoading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-4 pr-4 text-sm text-muted-foreground"
                      >
                        No lineage edges found for this pair and score
                        threshold.
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
                Click a lineage edge to inspect overlap between the parent and
                child clusters.
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
              <div className="mt-4 grid gap-4">
                <div>
                  <h3 className="font-medium">
                    {eulerQuery.data.labels.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {eulerQuery.data.labels.subtitle}
                  </p>
                  <p className="mt-3 text-sm">
                    {eulerQuery.data.labels.explanation}
                  </p>
                </div>

                <dl className="space-y-2 text-sm">
                  <div>Parent size: {eulerQuery.data.parent.size}</div>
                  <div>Child size: {eulerQuery.data.child.size}</div>
                  <div>Overlap: {eulerQuery.data.overlap.count}</div>
                  <div>
                    Parent coverage:{" "}
                    {formatNumber(
                      eulerQuery.data.overlap.parentCoverage,
                    )}
                  </div>
                  <div>
                    Child coverage:{" "}
                    {formatNumber(
                      eulerQuery.data.overlap.childCoverage,
                    )}
                  </div>
                  <div>Union size: {eulerQuery.data.overlap.unionSize}</div>
                  <div>Jaccard: {formatNumber(eulerQuery.data.overlap.jaccard)}</div>
                  <div>
                    Similarity: {formatNumber(eulerQuery.data.metrics.similarity)}
                  </div>
                  <div>Score: {formatNumber(eulerQuery.data.metrics.score)}</div>
                </dl>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}