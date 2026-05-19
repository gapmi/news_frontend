import { useMemo } from "react";
import type { LineageEdge } from "@/api/clustering";

type Props = {
  edges: LineageEdge[];
  parentRunId: number | null;
  childRunId: number | null;
};

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

export default function LineageCharts({
  edges,
  parentRunId,
  childRunId,
}: Props) {
  const topEdges = useMemo(() => {
    return [...edges]
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [edges]);

  if (!parentRunId || !childRunId) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-medium">Top lineage matches</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pair {parentRunId} → {childRunId}, ranked by lineage score.
        </p>

        {topEdges.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            No chart data for this pair.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {topEdges.map((edge) => {
              const scorePercent = Math.max(0, Math.min(edge.score * 100, 100));

              return (
                <button
                  key={edge.edgeId}
                  type="button"
                  className="w-full rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 lg:w-[260px]">
                      <div className="text-sm font-medium">
                        {`P${edge.parentClusterId} → C${edge.childClusterId}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {`Edge #${edge.edgeId} · parent ${edge.parentSize} · child ${edge.childSize}`}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${scorePercent}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Score {formatNumber(edge.score, 4)}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground lg:w-[260px]">
                      <div>
                        <div className="font-medium text-foreground">
                          {formatNumber(edge.centroidSimilarity, 3)}
                        </div>
                        <div>Similarity</div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {edge.articleOverlapCount}
                        </div>
                        <div>Overlap</div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {formatNumber(edge.articleOverlapRatio, 3)}
                        </div>
                        <div>Ratio</div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}