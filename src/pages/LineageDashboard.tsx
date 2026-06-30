import { useMemo, useState } from "react";
import {
  getLineageWindow,
} from "@/utils/lineageWindow";
import type { LineageEdge } from "@/api/clustering";
import LineageTopToolbar from "@/components/lineage/LineageTopToolbar";
import LineageWorkspaceTabs, {
  type CanvasMode,
} from "@/components/lineage/LineageWorkspaceTabs";
import LineageInspectorPane from "@/components/lineage/LineageInspectorPane";

// Ниже оставь свои реальные hooks / react-query вызовы
// import { useQuery } from "@tanstack/react-query";
// import { clusteringKeys, ... } from "@/api/clustering";

interface SelectedClusterState {
  runId: number;
  clusterId: number;
  label?: string | null;
}

export default function LineageDashboard() {
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("overview");
  const [anchorRunId, setAnchorRunId] = useState<number | null>(76);
  const [minScore, setMinScore] = useState<number>(0.42);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<SelectedClusterState | null>(
    null,
  );

  // TODO: заменить на реальные данные из API
  const allRunIds = [71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81];

  const lineageWindow = useMemo(() => {
    if (anchorRunId === null) return null;
    return getLineageWindow(allRunIds, anchorRunId, 5);
  }, [allRunIds, anchorRunId]);

  const startRunId = lineageWindow?.startRunId ?? anchorRunId ?? 0;
  const endRunId = lineageWindow?.endRunId ?? anchorRunId ?? 0;

  // TODO: здесь подключи свои useQuery:
  const sankeyData = null;
  const graphData = null;
  const eulerDetail = null;
  const clusterDetail = null;
  const selectedEdge: LineageEdge | null = null;

  // TODO: если у тебя уже есть activeEdgeIds из списка lineage edges — используй их
  const activeEdgeIds = useMemo(() => new Set<number>(), []);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr_auto] xl:items-center">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Lineage workspace
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Cluster lineage analysis
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              One analysis canvas, one inspector, and separate modes for lineage
              overview, pair graph, and overlap detail.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Anchor
              </div>
              <div className="mt-2 text-lg font-semibold">
                {anchorRunId ?? "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Active run focus
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Window
              </div>
              <div className="mt-2 text-lg font-semibold">
                {startRunId} → {endRunId}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Story window
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Min score
              </div>
              <div className="mt-2 text-lg font-semibold">{minScore}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Edge threshold
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Selection
              </div>
              <div className="mt-2 text-lg font-semibold">
                {selectedCluster ? `C${selectedCluster.clusterId}` : "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Inspector target
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button className="inline-flex min-h-10 items-center rounded-lg border border-border/70 bg-background px-4 text-sm">
              EN labels
            </button>
            <button className="inline-flex min-h-10 items-center rounded-lg border border-border/70 bg-background px-4 text-sm">
              Deep link
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <LineageTopToolbar
            timelineRunIds={lineageWindow?.runIds ?? allRunIds}
            anchorRunId={anchorRunId}
            minScore={minScore}
            onSelectRun={(runId) => setAnchorRunId(runId)}
            onChangeMinScore={setMinScore}
          />

          <LineageWorkspaceTabs
            mode={canvasMode}
            onChangeMode={setCanvasMode}
            sankeyData={sankeyData}
            graphData={graphData}
            eulerDetail={eulerDetail}
            selectedEdge={selectedEdge}
            selectedEdgeId={selectedEdgeId}
            activeEdgeIds={activeEdgeIds}
            focusedRunId={anchorRunId}
            onSelectEdge={(edgeId) => {
              setSelectedEdgeId(edgeId);
              setCanvasMode("overlap");
            }}
            onSelectCluster={(runId, clusterId, label) => {
              setSelectedCluster({ runId, clusterId, label });
            }}
          />
        </div>

        <LineageInspectorPane
          selectedCluster={selectedCluster}
          clusterDetail={clusterDetail}
          selectedEdge={selectedEdge}
          eulerDetail={eulerDetail}
          isLoadingCluster={false}
          clusterError={null}
          onCloseCluster={() => setSelectedCluster(null)}
        />
      </div>
    </div>
  );
}