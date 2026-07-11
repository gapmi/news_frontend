import type { ClusterDetail } from "@/api/clustering";
import ClusterArticlesList from "@/components/lineage/ClusterArticlesList";
import ClusterRadialMap from "@/components/clusters/ClusterRadialMap";

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
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-200",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
      />

      <aside
        className={[
          "fixed z-50 flex flex-col overflow-hidden bg-card shadow-2xl transition-transform duration-300 ease-out",
          "inset-x-0 bottom-0 top-auto h-[85dvh] w-full rounded-t-2xl border-t border-border/70",
          open
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full",
          "md:inset-y-0 md:right-0 md:left-auto md:h-screen md:w-full md:max-w-[520px] md:min-w-[360px] md:rounded-none md:border-t-0 md:border-l",
        ].join(" ")}
      >
        <div className="border-b border-border/70 px-4 py-3 md:px-5 md:py-4">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted md:hidden" />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Cluster inspection
              </div>
              <h2 className="mt-2 text-base font-semibold tracking-tight md:text-lg">
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
              className="min-h-10 shrink-0 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
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
                Cluster{" "}
                <span className="font-medium text-foreground">
                  C{selectedCluster.clusterId}
                </span>
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

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          {!selectedCluster ? (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
              Select a cluster in the graph or Sankey view to inspect its articles
              without leaving the Lineage page.
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
            <div className="space-y-4">
            <ClusterRadialMap
            radialMap={detail.radialMap}
            articles={detail.articles}
            title="Cluster radial map"
            />

              <ClusterArticlesList articles={detail.articles ?? []} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
              No cluster detail available.
            </div>
          )}
        </div>
      </aside>
    </>
  );
}