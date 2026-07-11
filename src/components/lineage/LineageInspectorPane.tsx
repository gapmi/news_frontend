import { useMemo, useState } from "react";
import type {
  ClusterDetail,
  EulerPairDetail,
  LineageEdge,
} from "@/api/clustering";
import ClusterRadialMap from "@/components/clusters/ClusterRadialMap";
import ClusterArticlesList from "@/components/lineage/ClusterArticlesList";

interface SelectedClusterState {
  runId: number;
  clusterId: number;
  label?: string | null;
}

interface Props {
  selectedCluster: SelectedClusterState | null;
  clusterDetail: ClusterDetail | null;
  selectedEdge: LineageEdge | null;
  eulerDetail: EulerPairDetail | null;
  isLoadingCluster: boolean;
  clusterError: string | null;
  onCloseCluster?: () => void;
}

type InspectorTab = "summary" | "structure" | "articles";

function getClusterTitle(
  selectedCluster: SelectedClusterState | null,
  detail: ClusterDetail | null,
) {
  if (detail?.nameShort?.trim()) return detail.nameShort;
  if (detail?.displayName?.trim()) return detail.displayName;
  if (selectedCluster?.label?.trim()) return selectedCluster.label;
  if (selectedCluster) return `C${selectedCluster.clusterId}`;
  return "No cluster selected";
}

function formatNumber(value: number | null | undefined, digits = 3) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : "—";
}

function formatConceptList(values: string[] | null | undefined) {
  if (!values || values.length === 0) return [];
  return values.filter(Boolean).slice(0, 8);
}

function InspectorTabButton({
  value,
  activeValue,
  onChange,
  children,
}: {
  value: InspectorTab;
  activeValue: InspectorTab;
  onChange: (value: InspectorTab) => void;
  children: React.ReactNode;
}) {
  const selected = value === activeValue;
  const tabId = `lineage-inspector-tab-${value}`;
  const panelId = `lineage-inspector-panel-${value}`;

  return (
    <button
      id={tabId}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      onClick={() => onChange(value)}
      className={[
        "min-h-10 rounded-lg border text-sm font-medium transition-colors",
        selected
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/70 bg-background text-muted-foreground hover:bg-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function LineageInspectorPane({
  selectedCluster,
  clusterDetail,
  selectedEdge,
  eulerDetail,
  isLoadingCluster,
  clusterError,
  onCloseCluster,
}: Props) {
  const [tab, setTab] = useState<InspectorTab>("structure");

  const clusterTitle = useMemo(
    () => getClusterTitle(selectedCluster, clusterDetail),
    [selectedCluster, clusterDetail],
  );

  const conceptList = useMemo(
    () => formatConceptList(clusterDetail?.concepts),
    [clusterDetail?.concepts],
  );

  const tagList = useMemo(
    () => (clusterDetail?.tags ?? []).filter(Boolean).slice(0, 10),
    [clusterDetail?.tags],
  );

  return (
    <aside className="sticky top-24 h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="rounded-2xl border border-border/70 bg-background">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Inspector
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight">
                {clusterTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedCluster
                  ? `Run ${selectedCluster.runId} · Cluster C${selectedCluster.clusterId}`
                  : "Select a cluster from overview or pair graph"}
              </p>
            </div>

            {selectedCluster ? (
              <button
                type="button"
                onClick={onCloseCluster}
                className="min-h-10 shrink-0 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <div className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-muted-foreground">
              Articles{" "}
              <span className="font-medium text-foreground">
                {clusterDetail?.articles.length ?? clusterDetail?.size ?? "—"}
              </span>
            </div>
            <div className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-muted-foreground">
              Incoming{" "}
              <span className="font-medium text-foreground">
                {clusterDetail?.incomingEdgeCount ?? "—"}
              </span>
            </div>
            <div className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-muted-foreground">
              Outgoing{" "}
              <span className="font-medium text-foreground">
                {clusterDetail?.outgoingEdgeCount ?? "—"}
              </span>
            </div>
          </div>

          <div
            className="mt-4 grid grid-cols-3 gap-2"
            role="tablist"
            aria-label="Inspector tabs"
          >
            <InspectorTabButton
              value="summary"
              activeValue={tab}
              onChange={setTab}
            >
              Summary
            </InspectorTabButton>
            <InspectorTabButton
              value="structure"
              activeValue={tab}
              onChange={setTab}
            >
              Structure
            </InspectorTabButton>
            <InspectorTabButton
              value="articles"
              activeValue={tab}
              onChange={setTab}
            >
              Articles
            </InspectorTabButton>
          </div>
        </div>

        <div className="px-4 py-4">
          {!selectedCluster ? (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
              Select a cluster in the lineage overview or pair graph. Structure stays
              here in the inspector, while the graph remains on the main canvas.
            </div>
          ) : isLoadingCluster ? (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
              <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
              <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
            </div>
          ) : clusterError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {clusterError}
            </div>
          ) : (
            <>
              <div
                id="lineage-inspector-panel-summary"
                role="tabpanel"
                aria-labelledby="lineage-inspector-tab-summary"
                hidden={tab !== "summary"}
              >
                {tab === "summary" ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/70 bg-background p-4">
                      <div className="text-sm font-medium">Cluster summary</div>

                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Run
                          </div>
                          <div>{selectedCluster.runId}</div>
                        </div>

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Cluster
                          </div>
                          <div>C{selectedCluster.clusterId}</div>
                        </div>

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Label
                          </div>
                          <div>{clusterTitle}</div>
                        </div>

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Size
                          </div>
                          <div>{clusterDetail?.size ?? "—"}</div>
                        </div>

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Language
                          </div>
                          <div>{clusterDetail?.languageCode ?? "—"}</div>
                        </div>

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Title
                          </div>
                          <div>
                            {clusterDetail?.representativeTitle ?? "No representative title"}
                          </div>
                        </div>

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Tags
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {tagList.length > 0 ? (
                              tagList.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-muted px-2 py-1 text-xs text-foreground"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Concepts
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {conceptList.length > 0 ? (
                              conceptList.map((concept) => (
                                <span
                                  key={concept}
                                  className="rounded-full border border-border/70 bg-background px-2 py-1 text-xs text-foreground"
                                >
                                  {concept}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedEdge ? (
                      <div className="rounded-xl border border-border/70 bg-background p-4">
                        <div className="text-sm font-medium">Active edge</div>

                        <div className="mt-4 space-y-3">
                          <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              Pair
                            </div>
                            <div>
                              {selectedEdge.parentRunId}:{selectedEdge.parentClusterId} →{" "}
                              {selectedEdge.childRunId}:{selectedEdge.childClusterId}
                            </div>
                          </div>

                          <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              Score
                            </div>
                            <div>{formatNumber(selectedEdge.score)}</div>
                          </div>

                          <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              Similarity
                            </div>
                            <div>{formatNumber(selectedEdge.centroidSimilarity)}</div>
                          </div>

                          <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              Overlap
                            </div>
                            <div>
                              {selectedEdge.articleOverlapCount} (
                              {formatNumber(selectedEdge.articleOverlapRatio)})
                            </div>
                          </div>

                          {eulerDetail ? (
                            <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
                              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                Jaccard
                              </div>
                              <div>{formatNumber(eulerDetail.overlap.jaccard)}</div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div
                id="lineage-inspector-panel-structure"
                role="tabpanel"
                aria-labelledby="lineage-inspector-tab-structure"
                hidden={tab !== "structure"}
              >
                {tab === "structure" ? (
                  <div className="space-y-4">
<ClusterRadialMap
  radialMap={clusterDetail?.radialMap}
  articles={clusterDetail?.articles}
  title="Cluster radial map"
/>

                    <div className="rounded-xl border border-dashed border-border/70 px-4 py-4 text-sm text-muted-foreground">
                      Structure is reserved for cluster-internal geometry only.
                      Pair graph stays on the main canvas, and overlap explanation stays
                      in the dedicated Overlap detail canvas mode.
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                id="lineage-inspector-panel-articles"
                role="tabpanel"
                aria-labelledby="lineage-inspector-tab-articles"
                hidden={tab !== "articles"}
              >
                {tab === "articles" ? (
                  <ClusterArticlesList articles={clusterDetail?.articles ?? []} />
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}