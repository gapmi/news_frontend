import type { ClusterDetail } from "@/api/clustering";
import ClusterArticlesList from "@/components/lineage/ClusterArticlesList";

interface SelectedClusterState {
  runId: number;
  clusterId: number;
  label?: string | null;
}

interface ClusterArticlesDrawerProps {
  open: boolean;
  selectedCluster: SelectedClusterState | null;
  detail: ClusterDetail | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

function getClusterTitle(
  selectedCluster: SelectedClusterState | null,
  detail: ClusterDetail | null,
) {
  if (detail?.nameShort && detail.nameShort.trim().length > 0) {
    return detail.nameShort;
  }

  if (detail?.displayName && detail.displayName.trim().length > 0) {
    return detail.displayName;
  }

  if (selectedCluster?.label && selectedCluster.label.trim().length > 0) {
    return selectedCluster.label;
  }

  if (selectedCluster) {
    return `C${selectedCluster.clusterId}`;
  }

  return "Cluster articles";
}

export default function ClusterArticlesDrawer({
  open,
  selectedCluster,
  detail,
  isLoading,
  error,
  onClose,
}: ClusterArticlesDrawerProps) {
  return (
    <>
      <div
        className={[
          "fixed inset-0 z-40 bg-black/20 transition-opacity duration-200",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
      />

      <aside
        className={[
          "fixed right-0 top-0 z-50 h-screen w-full max-w-[520px] min-w-[360px]",
          "border-l border-border/70 bg-card shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border/70 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Cluster inspection
                </div>
                <h2 className="mt-2 text-lg font-semibold tracking-tight">
                  {getClusterTitle(selectedCluster, detail)}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedCluster
                    ? `Run ${selectedCluster.runId} · Cluster ${selectedCluster.clusterId}`
                    : "No cluster selected"}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>

            {selectedCluster ? (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <div className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-muted-foreground">
                  Run <span className="font-medium text-foreground">{selectedCluster.runId}</span>
                </div>
                <div className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-muted-foreground">
                  Cluster <span className="font-medium text-foreground">C{selectedCluster.clusterId}</span>
                </div>
                <div className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-muted-foreground">
                  Articles{" "}
                  <span className="font-medium text-foreground">
                    {detail?.articles.length ?? "—"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {!selectedCluster ? (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                Select a cluster in the graph or Sankey view to inspect its articles without leaving the Lineage page.
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
                <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
                <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                {error}
              </div>
            ) : detail ? (
              <ClusterArticlesList articles={detail.articles ?? []} />
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                No cluster detail available.
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}