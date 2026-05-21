interface RunTimelineSliderProps {
  runIds: number[];
  selectedRunId: number | null;
  onSelectRun: (runId: number) => void;
}

export default function RunTimelineSlider({
  runIds,
  selectedRunId,
  onSelectRun,
}: RunTimelineSliderProps) {
  return (
    <section className="rounded-xl border bg-card px-5 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-medium">Run timeline</h2>
        <div className="text-xs text-muted-foreground">
          10-run storyline window
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 md:grid-cols-10">
        {runIds.map((runId) => {
          const isSelected = runId === selectedRunId;

          return (
            <button
              key={runId}
              type="button"
              onClick={() => onSelectRun(runId)}
              className={
                isSelected
                  ? "rounded-lg border border-primary bg-primary/10 px-3 py-3 text-left shadow-sm"
                  : "rounded-lg border bg-background px-3 py-3 text-left hover:bg-muted/40"
              }
            >
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Run
              </div>
              <div className="mt-1 text-sm font-semibold">{runId}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}