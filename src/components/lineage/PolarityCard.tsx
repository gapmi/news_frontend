interface PolarityCardProps {
  leftTitle: string;
  leftMeta: string;
  rightTitle: string;
  rightMeta: string;
}

export default function PolarityCard({
  leftTitle,
  leftMeta,
  rightTitle,
  rightMeta,
}: PolarityCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-medium">Polarity</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Two distant article narratives inside the current cluster
      </p>

      <div className="mt-4 grid gap-3">
        <div className="rounded-lg border bg-background p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Narrative A
          </div>
          <div className="mt-2 text-sm font-medium">{leftTitle}</div>
          <div className="mt-2 text-xs text-muted-foreground">{leftMeta}</div>
        </div>

        <div className="rounded-lg border bg-background p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Narrative B
          </div>
          <div className="mt-2 text-sm font-medium">{rightTitle}</div>
          <div className="mt-2 text-xs text-muted-foreground">{rightMeta}</div>
        </div>
      </div>
    </div>
  );
}