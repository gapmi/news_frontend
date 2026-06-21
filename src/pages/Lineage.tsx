import { useEffect, useMemo, useState } from "react";
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
import { getLineageWindow } from "@/utils/lineageWindow";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

interface RunPair {
  parentRunId: number;
  childRunId: number;
}

export default function Lineage() {
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [manualParentRunId, setManualParentRunId] = useState<number | null>(null);
  const [manualChildRunId, setManualChildRunId] = useState<number | null>(null);

  const runsQuery = useQuery({
    queryKey: clusteringKeys.runs({ status: "success", limit: 10 }),
    queryFn: () => getClusteringRuns({ status: "success", limit: 10 }),
  });

  const runs = runsQuery.data?.items ?? [];

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

  const defaultPair = availablePairs[0] ?? null;

  const parentOptions = useMemo(() => {
    return [...new Set(availablePairs.map((pair) => pair.parentRunId))];
  }, [availablePairs]);

  const parentRunId = manualParentRunId ?? defaultPair?.parentRunId ?? null;

  const childOptions = useMemo(() => {
    if (parentRunId === null) {
      return [];
    }

    return availablePairs
      .filter((pair) => pair.parentRunId === parentRunId)
      .map((pair) => pair.childRunId);
  }, [availablePairs, parentRunId]);

  const childRunId = useMemo(() => {
    if (manualChildRunId !== null && childOptions.includes(manualChildRunId)) {
      return manualChildRunId;
    }

    const defaultChild = availablePairs.find(
      (pair) => pair.parentRunId === parentRunId,
    )?.childRunId;

    if (defaultChild !== undefined && childOptions.includes(defaultChild)) {
      return defaultChild;
    }

    return childOptions[0] ?? null;
  }, [manualChildRunId, childOptions, availablePairs, parentRunId]);

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

  const childRunHelperText = useMemo(() => {
    if (parentRunId === null) {
      return "Choose a parent run to see valid child runs";
    }

    if (childOptions.length === 0) {
      return `No valid child runs for parent ${parentRunId}`;
    }

    return `Available for parent ${parentRunId}: ${childOptions.join(", ")}`;
  }, [parentRunId, childOptions]);

  const sankeyWindow = useMemo(() => {
    if (parentRunId === null) {
      return null;
    }

    return getLineageWindow(sortedLineageRunIds, parentRunId, 5);
  }, [sortedLineageRunIds, parentRunId]);

  const sankeyParams = sankeyWindow
    ? {
        startrunid: sankeyWindow.startRunId,
        endrunid: sankeyWindow.endRunId,
        minscore: minScore,
      }
    : null;

  const graphParams = sankeyWindow
    ? {
        startrunid: sankeyWindow.startRunId,
        endrunid: sankeyWindow.endRunId,
        minscore: minScore,
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
          limit: 20,
        }
      : null;

  const sankeyQuery = useQuery({
    queryKey: sankeyParams
      ? clusteringKeys.sankey(sankeyParams)
      : clusteringKeys.sankey({ startrunid: 0, endrunid: 0 }),
    queryFn: () => getSankeyView(sankeyParams!),
    enabled: Boolean(sankeyParams),
    placeholderData: keepPreviousData,
  });

  const graphQuery = useQuery({
    queryKey: graphParams
      ? clusteringKeys.graph(graphParams)
      : clusteringKeys.graph({ startrunid: 0, endrunid: 0 }),
    queryFn: () => getGraphView(graphParams!),
    enabled: Boolean(graphParams),
    placeholderData: keepPreviousData,
  });

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
              {parentRunId !== null ? (
                <div className="space-y-1">
                  <div>Anchor run: {parentRunId}</div>
                  <div>
                    Pair: {parentRunId ?? "—"} → {childRunId ?? "—"}
                  </div>
                  <div>
                    Sankey window: {sankeyWindow?.startRunId ?? "—"} →{" "}
                    {sankeyWindow?.endRunId ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Runs in window: {sankeyWindow?.runIds.length ?? 0}
                  </div>
                </div>
              ) : (
                "No lineage pair available"
              )}
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
                <div>
                  Window: {sankeyWindow?.startRunId ?? "—"} →{" "}
                  {sankeyWindow?.endRunId ?? "—"}
                </div>
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
                <div>
                  Window: {sankeyWindow?.startRunId ?? "—"} →{" "}
                  {sankeyWindow?.endRunId ?? "—"}
                </div>
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
                  First with lineage: {sortedLineageRunIds[0] ?? "—"}
                </div>
                <div>
                  Last with lineage: {sortedLineageRunIds[sortedLineageRunIds.length - 1] ?? "—"}
                </div>
                <div>
                  Anchor updated window around selected parent run.
                </div>
                <div>
                  Latest started: {formatDate(runs[0]?.startedAt ?? null)}
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

                {edges.length === 0 && !edgesQuery.isLoading && (
                  <tr>
                    <td colSpan={6} className="py-4 text-sm text-muted-foreground">
                      No lineage edges found for the selected pair.
                    </td>
                  </tr>
                )}
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
                <div>
                  Parent coverage: {formatNumber(eulerQuery.data.overlap.parentCoverage)}
                </div>
                <div>
                  Child coverage: {formatNumber(eulerQuery.data.overlap.childCoverage)}
                </div>
                <div>Jaccard: {formatNumber(eulerQuery.data.overlap.jaccard)}</div>
              </dl>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}