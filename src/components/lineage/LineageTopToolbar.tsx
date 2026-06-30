interface Props {
  timelineRunIds: number[];
  anchorRunId: number | null;
  minScore: number;
  onSelectRun: (runId: number) => void;
  onChangeMinScore: (value: number) => void;
}

export default function LineageTopToolbar({
  timelineRunIds,
  anchorRunId,
  minScore,
  onSelectRun,
  onChangeMinScore,
}: Props) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="rounded-xl border border-border/70 bg-background px-3 py-2 text-sm">
            <span className="text-muted-foreground">Min score </span>
            <input
              className="ml-2 w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={minScore}
              onChange={(event) => onChangeMinScore(Number(event.target.value))}
            />
          </div>

          <div className="rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground">
            Window mode <span className="font-medium text-foreground">11-run story</span>
          </div>

          <div className="rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground">
            Density <span className="font-medium text-foreground">Balanced</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Anchor run and analysis window
        </div>
      </div>

      <div className="mt-4 -mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-max flex-nowrap gap-2 px-1">
          {timelineRunIds.map((runId) => {
            const isActive = anchorRunId === runId;

            return (
              <button
                key={runId}
                type="button"
                onClick={() => onSelectRun(runId)}
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
                <span className="mt-1 text-lg font-semibold leading-none">{runId}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}