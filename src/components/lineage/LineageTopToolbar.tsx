import { useMemo } from "react";

interface Props {
  timelineRunIds: number[];
  anchorRunId: number | null;
  minScore: number;
  onSelectRun: (runId: number) => void;
  onChangeMinScore: (value: number) => void;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function formatScore(value: number) {
  return clampScore(value).toFixed(2);
}

export default function LineageTopToolbar({
  timelineRunIds,
  anchorRunId,
  minScore,
  onSelectRun,
  onChangeMinScore,
}: Props) {
  const safeScore = useMemo(() => clampScore(minScore), [minScore]);

  const activeWindowLabel = useMemo(() => {
    if (timelineRunIds.length === 0) return "—";
    const start = timelineRunIds[0];
    const end = timelineRunIds[timelineRunIds.length - 1];
    return `${start} → ${end}`;
  }, [timelineRunIds]);

  const pairLabel = useMemo(() => {
    if (anchorRunId === null || timelineRunIds.length === 0) return "—";
    const index = timelineRunIds.indexOf(anchorRunId);
    if (index > 0) {
      return `${timelineRunIds[index - 1]} → ${anchorRunId}`;
    }
    if (index >= 0 && index < timelineRunIds.length - 1) {
      return `${anchorRunId} → ${timelineRunIds[index + 1]}`;
    }
    return "—";
  }, [anchorRunId, timelineRunIds]);

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Analysis controls
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">
              Run window and threshold
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Control the anchor run, active story window, and edge threshold from one
              compact surface instead of splitting context and controls into separate
              blocks.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <div className="rounded-full border border-border/70 bg-background px-3 py-2">
              Window {activeWindowLabel}
            </div>
            <div className="rounded-full border border-border/70 bg-background px-3 py-2">
              Pair {pairLabel}
            </div>
            <div className="rounded-full border border-border/70 bg-background px-3 py-2">
              Min score {formatScore(safeScore)}
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl border border-border/70 bg-background p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Run timeline</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Select the anchor run for the active lineage window.
                </div>
              </div>

              <div className="rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {timelineRunIds.length}-run window
              </div>
            </div>

            {timelineRunIds.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                No runs available.
              </div>
            ) : (
              <div className="-mx-1 overflow-x-auto pb-1">
                <div className="flex min-w-max flex-nowrap gap-2 px-1">
                  {timelineRunIds.map((runId) => {
                    const isActive = anchorRunId === runId;

                    return (
                      <button
                        key={runId}
                        type="button"
                        onClick={() => onSelectRun(runId)}
                        aria-pressed={isActive}
                        className={[
                          "flex h-14 w-[92px] shrink-0 flex-col items-start justify-center rounded-lg border px-3 text-left transition-colors",
                          isActive
                            ? "border-foreground bg-foreground text-background shadow-sm"
                            : "border-border bg-background text-foreground hover:bg-muted/60",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "text-[10px] uppercase tracking-[0.14em]",
                            isActive ? "text-background/70" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {isActive ? "Anchor" : "Run"}
                        </span>
                        <span className="mt-1 text-lg font-semibold leading-none">
                          {runId}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-background p-3">
            <div className="text-sm font-medium">Threshold controls</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Keep threshold editing in the same row as the current applied state.
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="lineage-min-score-range"
                    className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Min score
                  </label>
                  <div className="rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-sm font-medium">
                    {formatScore(safeScore)}
                  </div>
                </div>

                <input
                  id="lineage-min-score-range"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={safeScore}
                  onChange={(event) => onChangeMinScore(Number(event.target.value))}
                  className="w-full accent-foreground"
                  aria-label="Minimum lineage edge score"
                />

                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>0.00</span>
                  <span>0.50</span>
                  <span>1.00</span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="lineage-min-score-input"
                  className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Exact value
                </label>

                <input
                  id="lineage-min-score-input"
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={safeScore}
                  onChange={(event) => onChangeMinScore(Number(event.target.value))}
                  className="flex h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-foreground"
                  aria-label="Minimum score numeric input"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[0.2, 0.35, 0.42, 0.55, 0.7].map((preset) => {
                  const active = Math.abs(safeScore - preset) < 0.005;

                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onChangeMinScore(preset)}
                      className={[
                        "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {preset.toFixed(2)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
            Anchor run{" "}
            <span className="font-medium text-foreground">
              {anchorRunId ?? "—"}
            </span>
          </div>

          <div className="rounded-full border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
            Active window{" "}
            <span className="font-medium text-foreground">
              {activeWindowLabel}
            </span>
          </div>

          <div className="rounded-full border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
            Threshold{" "}
            <span className="font-medium text-foreground">
              {formatScore(safeScore)}
            </span>
          </div>

          <div className="rounded-full border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
            Pair preview{" "}
            <span className="font-medium text-foreground">{pairLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}