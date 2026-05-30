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
        <div className="overflow-x-auto">
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
      )}
    </AnalyticsSection>
  );
}