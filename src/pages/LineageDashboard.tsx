import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  clusteringKeys,
  getClusteringRuns,
  getPipelineRuns,
} from "@/api/clustering";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function LineageDashboard() {
  const [manualStartRunId, setManualStartRunId] = useState<number | null>(null);
  const [manualEndRunId, setManualEndRunId] = useState<number | null>(null);
  const [minScore, setMinScore] = useState(0);

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

  const defaultRange = useMemo(() => {
    if (lineageRuns.length === 0) {
      return null;
    }

    const ids = lineageRuns.map((run) => run.runId);

    return {
      startRunId: Math.min(...ids),
      endRunId: Math.max(...ids),
    };
  }, [lineageRuns]);

  const startRunId = manualStartRunId ?? defaultRange?.startRunId ?? null;
  const endRunId = manualEndRunId ?? defaultRange?.endRunId ?? null;

  const viewParams =
    startRunId && endRunId
      ? {
          start_run_id: startRunId,
          end_run_id: endRunId,
          min_score: minScore,
        }
      : null;

  const totalVisibleLineageEdges = useMemo(() => {
    return runs.reduce((sum, run) => sum + run.parentLineageEdgeCount, 0);
  }, [runs]);

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

            <div className="flex items-end rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {viewParams
                ? `Range: ${viewParams.start_run_id} → ${viewParams.end_run_id}`
                : "No lineage range available"}
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-medium">Flow view</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sankey visualization will show how topic clusters move across runs.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-medium">Run health</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Quality metrics and pipeline execution status will be displayed here.
            </p>
          </div>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-medium">Graph view</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cluster topology and lineage edges will be shown as a navigable graph.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-medium">Euler detail</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Selected lineage pairs will expose overlap, coverage, and union detail.
            </p>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-medium">Lineage table</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Filtered lineage edges and selected cluster pairs will be listed here.
          </p>
        </section>
      </main>
    </div>
  );
}