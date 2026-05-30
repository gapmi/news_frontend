import type { LineageEdge } from "@/api/clustering";
import AnalyticsSection from "@/components/lineage/page/AnalyticsSection";
import SectionState from "@/components/lineage/page/SectionState";

interface LineageEdgesSectionProps {
  edges: LineageEdge[];
  isLoading: boolean;
  error: string | null;
  selectedEdgeId: number | null;
  onSelectEdge: (edgeId: number) => void;
  parentRunId: number | null;
  childRunId: number | null;
  getClusterTag: (runId: number, clusterId: number) => string;
  formatClusterTitle: (clusterId: number, tag: string) => string;
  formatNumber: (value: number, digits?: number) => string;
}

function MobileEdgeCard({
  edge,
  isSelected,
  onSelectEdge,
  getClusterTag,
  formatClusterTitle,
  formatNumber,
}: {
  edge: LineageEdge;
  isSelected: boolean;
  onSelectEdge: (edgeId: number) => void;
  getClusterTag: (runId: number, clusterId: number) => string;
  formatClusterTitle: (clusterId: number, tag: string) => string;
  formatNumber: (value: number, digits?: number) => string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelectEdge(edge.edgeId)}
      className={[
        "w-full rounded-xl border px-4 py-4 text-left transition-colors",
        isSelected
          ? "border-foreground/15 bg-muted"
          : "border-border/70 bg-background hover:bg-muted/40",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Edge #{edge.edgeId}</div>
          <div className="mt-1 text-sm font-semibold leading-6 text-foreground">
            {formatClusterTitle(
              edge.parentClusterId,
              getClusterTag(edge.parentRunId, edge.parentClusterId),
            )}
            {" → "}
            {formatClusterTitle(
              edge.childClusterId,
              getClusterTag(edge.childRunId, edge.childClusterId),
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground">
          {formatNumber(edge.score)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-muted-foreground">Parent</div>
          <div className="mt-1 font-medium text-foreground">
            Run {edge.parentRunId} · size {edge.parentSize}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-muted-foreground">Child</div>
          <div className="mt-1 font-medium text-foreground">
            Run {edge.childRunId} · size {edge.childSize}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-muted-foreground">Similarity</div>
          <div className="mt-1 font-medium text-foreground">
            {formatNumber(edge.centroidSimilarity)}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-muted-foreground">Overlap</div>
          <div className="mt-1 font-medium text-foreground">
            {edge.articleOverlapCount} ({formatNumber(edge.articleOverlapRatio)})
          </div>
        </div>
      </div>
    </button>
  );
}

export default function LineageEdgesSection({
  edges,
  isLoading,
  error,
  selectedEdgeId,
  onSelectEdge,
  parentRunId,
  childRunId,
  getClusterTag,
  formatClusterTitle,
  formatNumber,
}: LineageEdgesSectionProps) {
  return (
    <AnalyticsSection
      title="Lineage inspection"
      description={`Detailed parent/child edge pairs for run ${parentRunId ?? "—"} → ${childRunId ?? "—"}`}
    >
      {error ? (
        <SectionState
          kind="error"
          title="Failed to load lineage edges"
          message={error}
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {edges.map((edge) => (
              <MobileEdgeCard
                key={edge.edgeId}
                edge={edge}
                isSelected={selectedEdgeId === edge.edgeId}
                onSelectEdge={onSelectEdge}
                getClusterTag={getClusterTag}
                formatClusterTitle={formatClusterTitle}
                formatNumber={formatNumber}
              />
            ))}

            {isLoading && edges.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                Loading lineage edges…
              </div>
            )}

            {!isLoading && edges.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                No lineage edges found for the selected pair.
              </div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
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
                {edges.map((edge) => {
                  const isSelected = selectedEdgeId === edge.edgeId;

                  return (
                    <tr
                      key={edge.edgeId}
                      className={
                        isSelected
                          ? "cursor-pointer border-b bg-muted hover:bg-muted"
                          : "cursor-pointer border-b hover:bg-muted/50"
                      }
                      onClick={() => onSelectEdge(edge.edgeId)}
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

                {isLoading && edges.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-sm text-muted-foreground">
                      Loading lineage edges…
                    </td>
                  </tr>
                )}

                {!isLoading && edges.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-sm text-muted-foreground">
                      No lineage edges found for the selected pair.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AnalyticsSection>
  );
}