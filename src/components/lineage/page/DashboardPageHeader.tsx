interface DashboardPageHeaderProps {
  title: string;
  subtitle: string;
  parentRunId: number | null;
  childRunId: number | null;
  windowStartRunId: number | null;
  windowEndRunId: number | null;
  pipelineStatus: string | null;
}

function HeaderMetaItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold tracking-tight text-foreground">
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function DashboardPageHeader({
  title,
  subtitle,
  parentRunId,
  childRunId,
  windowStartRunId,
  windowEndRunId,
  pipelineStatus,
}: DashboardPageHeaderProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
      <div className="grid gap-6 px-5 py-6 xl:grid-cols-[minmax(0,1.25fr)_420px] xl:px-6">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Lineage dashboard
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <HeaderMetaItem
            label="Pair"
            value={
              parentRunId !== null && childRunId !== null
                ? `${parentRunId} → ${childRunId}`
                : "—"
            }
          />
          <HeaderMetaItem
            label="Window"
            value={
              windowStartRunId !== null && windowEndRunId !== null
                ? `${windowStartRunId} → ${windowEndRunId}`
                : "—"
            }
          />
          <HeaderMetaItem label="Anchor run" value={parentRunId} />
          <HeaderMetaItem label="Pipeline" value={pipelineStatus ?? "—"} />
        </div>
      </div>
    </section>
  );
}