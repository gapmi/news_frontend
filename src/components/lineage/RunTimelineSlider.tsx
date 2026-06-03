import { cn } from "@/lib/utils";

type Props = {
  runIds: number[];
  selectedRunId: number | null;
  onSelectRun: (runId: number) => void;
  windowLabel?: string;
};

export default function RunTimelineSlider({
  runIds,
  selectedRunId,
  onSelectRun,
  windowLabel,
}: Props) {
  if (!runIds.length) return null;

  return (
    <section className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Run timeline</h2>
        </div>

        <div className="shrink-0 text-xs text-muted-foreground">
          {windowLabel ?? `${runIds.length}-run storyline window`}
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-max flex-nowrap gap-2 px-1">
          {runIds.map((runId) => {
            const isActive = selectedRunId === runId;

            return (
              <button
                key={runId}
                type="button"
                onClick={() => onSelectRun(runId)}
                className={cn(
                  "flex h-14 w-[92px] shrink-0 flex-col items-start justify-center rounded-lg border px-3 text-left transition-colors",
                  isActive
                    ? "border-foreground bg-muted text-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:bg-muted/60",
                )}
              >
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Run
                </span>
                <span className="mt-1 text-lg font-semibold leading-none">
                  {runId}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}