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

function InspectorField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="min-w-0 text-sm text-foreground break-words">{value}</div>
    </div>
  );
}

function InspectorCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
      <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </div>
        <h3 className="mt-2 text-sm font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-3 px-4 py-4">{children}</div>
    </div>
  );
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
      title="Context rail"
      description="Secondary controls, current cluster focus, and active lineage edge inspection."
      contentClassName="space-y-5"
    >
      <LineageRightPanel
        tagLanguage={tagLanguage}
        onChangeTagLanguage={onChangeTagLanguage}
      />

      <InspectorCard
        eyebrow="Cluster focus"
        title={selectedCluster ? `C${selectedCluster.clusterId}` : "No cluster selected"}
        description={
          selectedCluster
            ? "Current cluster selected from the preserved semantic graph."
            : "Select a cluster in the semantic map to inspect its current context."
        }
      >
        {selectedCluster ? (
          <>
            <InspectorField label="Run" value={String(selectedCluster.runId)} />
            <InspectorField label="Cluster" value={`C${selectedCluster.clusterId}`} />
            <InspectorField label="Label" value={selectedCluster.label ?? "—"} />
          </>
        ) : (
          <div className="rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
            No cluster selected.
          </div>
        )}
      </InspectorCard>

      <InspectorCard
        eyebrow="Edge focus"
        title={selectedEdge ? `Edge #${selectedEdge.edgeId}` : "No edge selected"}
        description={
          selectedEdge
            ? "Selection shared across Sankey, graph, table, and Euler overlap detail."
            : "Select an edge in Sankey, graph, or lineage inspection table to inspect the active linkage."
        }
      >
        {selectedEdge ? (
          <>
            <InspectorField label="Pair" value={`${selectedEdge.parentRunId}:${selectedEdge.parentClusterId} → ${selectedEdge.childRunId}:${selectedEdge.childClusterId}`} />
            <InspectorField label="Score" value={formatNumber(selectedEdge.score)} />
            <InspectorField label="Similarity" value={formatNumber(selectedEdge.centroidSimilarity)} />
            <InspectorField
              label="Overlap"
              value={`${selectedEdge.articleOverlapCount} (${formatNumber(selectedEdge.articleOverlapRatio)})`}
            />
          </>
        ) : (
          <div className="rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
            No edge selected.
          </div>
        )}
      </InspectorCard>
    </AnalyticsSection>
  );
}