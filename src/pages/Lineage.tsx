import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  clusteringKeys,
  getClusteringRuns,
  getEulerPairDetail,
  getGraphView,
  getLineageEdges,
  getSankeyView,
  type LineageEdge,
} from "@/api/clustering";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

export default function Lineage() {
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);
  const [minScore, setMinScore] = useState(0);

  const runsQuery = useQuery({
    queryKey: clusteringKeys.runs({ status: "success", limit: 10 }),
    queryFn: () => getClusteringRuns({ status: "success", limit: 10 }),
  });

  const defaultRange = useMemo(() => {
    const runs = runsQuery.data?.items ?? [];
    const runsWithLineage = runs
      .filter((run) => run.parentLineageEdgeCount > 0 || run.childLineageEdgeCount > 0)
      .map((run) => run.runId);

    if (runsWithLineage.length === 0) {
      return null;
    }

    return {
      startRunId: Math.min(...runsWithLineage),
      endRunId: Math.max(...runsWithLineage),
    };
  }, [runsQuery.data]);

  const [manualStartRunId, setManualStartRunId] = useState<number | null>(null);
  const [manualEndRunId, setManualEndRunId] = useState<number | null>(null);

  const startRunId = manualStartRunId ?? defaultRange?.startRunId ?? null;
  const endRunId = manualEndRunId ?? defaultRange?.endRunId ?? null;

  const viewParams = startRunId && endRunId
    ? {
        start_run_id: startRunId,
        end_run_id: endRunId,
        min_score: minScore,
      }
    : null;

  const sankeyQuery = useQuery({
    queryKey: viewParams
      ? clusteringKeys.sankey(viewParams)
      : clusteringKeys.sankey({ start_run_id: 0, end_run_id: 0 }),
    queryFn: () => getSankeyView(viewParams!),
    enabled: Boolean(viewParams),
    placeholderData: keepPreviousData,
  });

  const graphQuery = useQuery({
    queryKey: viewParams
      ? clusteringKeys.graph(viewParams)
      : clusteringKeys.graph({ start_run_id: 0, end_run_id: 0 }),
    queryFn: () => getGraphView(viewParams!),
    enabled: Boolean(viewParams),
    placeholderData: keepPreviousData,
  });

  const edgeParams = startRunId && endRunId
    ? {
        parent_run_id: startRunId,
        child_run_id: startRunId + 1,
        min_score: minScore,
        limit: 20,
      }
    : null;

  const edgesQuery = useQuery({
    queryKey: edgeParams
      ? clusteringKeys.lineageEdges(edgeParams)
      : clusteringKeys.lineageEdges({ limit: 20 }),
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

  const runs = runsQuery.data?.items ?? [];
  const edges = edgesQuery.data?.items ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Cluster Lineage
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Backend API smoke test for runs, Sankey, graph, lineage edges, and Euler detail.
          </p>
        </div>

        <section className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">Controls</h2>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm">
              Start run
              <select
                className="rounded-md border bg-background px-3 py-2"
                value={startRunId ?? ""}
                onChange={(event) => setManualStartRunId(Number(event.target.value))}
              >
                {runs.map((run) => (
                  <option key={run.runId} value={run.runId}>
                    Run {run.runId}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              End run
              <select
                className="rounded-md border bg-background px-3 py-2"
                value={endRunId ?? ""}
                onChange={(event) => setManualEndRunId(Number(event.target.value))}
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
                onChange={(event) => setMinScore(Number(event.target.value))}
              />
            </label>

            <div className="flex items-end text-sm text-muted-foreground">
              {startRunId && endRunId
                ? `Range: ${startRunId} → ${endRunId}`
                : "No lineage range available"}
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-medium">Sankey</h2>
            {sankeyQuery.isLoading && <p className="mt-2 text-sm">Loading...</p>}
            {sankeyQuery.error && (
              <p className="mt-2 text-sm text-red-600">
                {(sankeyQuery.error as Error).message}
              </p>
            )}
            {sankeyQuery.data && (
              <dl className="mt-3 space-y-1 text-sm">
                <div>Nodes: {sankeyQuery.data.stats.nodeCount}</div>
                <div>Links: {sankeyQuery.data.stats.linkCount}</div>
                <div>Runs: {sankeyQuery.data.stats.runCount}</div>
              </dl>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-medium">Graph</h2>
            {graphQuery.isLoading && <p className="mt-2 text-sm">Loading...</p>}
            {graphQuery.error && (
              <p className="mt-2 text-sm text-red-600">
                {(graphQuery.error as Error).message}
              </p>
            )}
            {graphQuery.data && (
              <dl className="mt-3 space-y-1 text-sm">
                <div>Nodes: {graphQuery.data.stats.nodeCount}</div>
                <div>Edges: {graphQuery.data.stats.edgeCount}</div>
                <div>Groups: {graphQuery.data.groups.length}</div>
              </dl>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-medium">Runs</h2>
            {runsQuery.isLoading && <p className="mt-2 text-sm">Loading...</p>}
            {runsQuery.data && (
              <dl className="mt-3 space-y-1 text-sm">
                <div>Total loaded: {runs.length}</div>
                <div>Latest: {runs[0]?.runId ?? "—"}</div>
                <div>
                  Default range: {defaultRange ? `${defaultRange.startRunId} → ${defaultRange.endRunId}` : "—"}
                </div>
              </dl>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">Lineage edges</h2>

          {edgesQuery.isLoading && <p className="text-sm">Loading edges...</p>}
          {edgesQuery.error && (
            <p className="text-sm text-red-600">
              {(edgesQuery.error as Error).message}
            </p>
          )}

          <div className="overflow-x-auto">
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
                    <td className="py-2 pr-4">{formatNumber(edge.score)}</td>
                    <td className="py-2 pr-4">{formatNumber(edge.centroidSimilarity)}</td>
                    <td className="py-2 pr-4">
                      {edge.articleOverlapCount} ({formatNumber(edge.articleOverlapRatio)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">Euler detail</h2>

          {!selectedEdgeId && (
            <p className="text-sm text-muted-foreground">
              Click a lineage edge to load pair detail.
            </p>
          )}

          {eulerQuery.isLoading && <p className="text-sm">Loading detail...</p>}

          {eulerQuery.error && (
            <p className="text-sm text-red-600">
              {(eulerQuery.error as Error).message}
            </p>
          )}

          {eulerQuery.data && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium">{eulerQuery.data.labels.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {eulerQuery.data.labels.subtitle}
                </p>
                <p className="mt-3 text-sm">
                  {eulerQuery.data.labels.explanation}
                </p>
              </div>

              <dl className="space-y-1 text-sm">
                <div>Parent size: {eulerQuery.data.parent.size}</div>
                <div>Child size: {eulerQuery.data.child.size}</div>
                <div>Overlap: {eulerQuery.data.overlap.count}</div>
                <div>Parent coverage: {formatNumber(eulerQuery.data.overlap.parentCoverage)}</div>
                <div>Child coverage: {formatNumber(eulerQuery.data.overlap.childCoverage)}</div>
                <div>Jaccard: {formatNumber(eulerQuery.data.overlap.jaccard)}</div>
              </dl>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}