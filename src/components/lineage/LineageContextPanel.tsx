import type { LineageEdge } from "@/api/clustering";
import LineageRightPanel from "@/components/lineage/LineageRightPanel";
import AnalyticsSection from "@/components/lineage/page/AnalyticsSection";

interface SelectedClusterState {
  runId: number;
  clusterId: number;
  label?: string | null;
}

interface LineageContextPanelProps {
  tagLanguage: "RU" | "EN";
  onChangeTagLanguage: (value: "RU" | "EN") => void;
  selectedCluster: SelectedClusterState | null;
  selectedEdge: LineageEdge | null;
  formatNumber: (value: number, digits?: number) => string;
}

export default function LineageContextPanel({
  tagLanguage,
  onChangeTagLanguage,
  selectedCluster,
  selectedEdge,
  formatNumber,
}: LineageContextPanelProps) {
  return (
    <AnalyticsSection
      title="Context"
      description="Secondary controls and selection context for the current lineage window."
      contentClassName="space-y-5"
    >
      <LineageRightPanel
        tagLanguage={tagLanguage}
        onChangeTagLanguage={onChangeTagLanguage}
      />

      <div className="rounded-xl border bg-background px-4 py-4">
        <h3 className="text-sm font-semibold">Selected cluster</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Preserved graph interaction debug context.
        </p>

        {selectedCluster ? (
          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Run:</span>{" "}
              {selectedCluster.runId}
            </div>
            <div>
              <span className="text-muted-foreground">Cluster:</span>{" "}
              C{selectedCluster.clusterId}
            </div>
            <div>
              <span className="text-muted-foreground">Label:</span>{" "}
              {selectedCluster.label ?? "—"}
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-muted-foreground">
            No cluster selected.
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-background px-4 py-4">
        <h3 className="text-sm font-semibold">Selected edge</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Current edge selection synchronized with Sankey, graph, table, and Euler detail.
        </p>

        {selectedEdge ? (
          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Edge:</span>{" "}
              {selectedEdge.edgeId}
            </div>
            <div>
              <span className="text-muted-foreground">Pair:</span>{" "}
              {selectedEdge.parentRunId}:{selectedEdge.parentClusterId} →{" "}
              {selectedEdge.childRunId}:{selectedEdge.childClusterId}
            </div>
            <div>
              <span className="text-muted-foreground">Score:</span>{" "}
              {formatNumber(selectedEdge.score)}
            </div>
            <div>
              <span className="text-muted-foreground">Overlap:</span>{" "}
              {selectedEdge.articleOverlapCount} (
              {formatNumber(selectedEdge.articleOverlapRatio)})
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-muted-foreground">
            No edge selected.
          </div>
        )}
      </div>
    </AnalyticsSection>
  );
}