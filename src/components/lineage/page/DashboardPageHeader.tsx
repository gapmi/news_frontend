interface DashboardPageHeaderProps {
  title: string;
  subtitle: string;
  parentRunId: number | null;
  childRunId: number | null;
  windowStartRunId: number | null;
  windowEndRunId: number | null;
  pipelineStatus: string | null;
}

function MetaChip({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="rounded-xl border bg-background px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">
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
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-5 px-5 py-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Lineage analytics
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:min-w-[520px]">
          <MetaChip label="Pair" value={parentRunId !== null && childRunId !== null ? `${parentRunId} → ${childRunId}` : "—"} />
          <MetaChip
            label="Window"
            value={
              windowStartRunId !== null && windowEndRunId !== null
                ? `${windowStartRunId} → ${windowEndRunId}`
                : "—"
            }
          />
          <MetaChip label="Anchor run" value={parentRunId} />
          <MetaChip label="Pipeline" value={pipelineStatus ?? "—"} />
        </div>
      </div>
    </section>
  );
}