type SectionStateKind = "loading" | "empty" | "error";

interface SectionStateProps {
  kind: SectionStateKind;
  title: string;
  message?: string;
}

const toneClassByKind: Record<SectionStateKind, string> = {
  loading: "border-dashed text-muted-foreground",
  empty: "border-dashed text-muted-foreground",
  error: "border-red-200 bg-red-50/40 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300",
};

export default function SectionState({
  kind,
  title,
  message,
}: SectionStateProps) {
  return (
    <div
      className={`flex min-h-[220px] flex-col items-center justify-center rounded-xl border px-6 py-10 text-center ${toneClassByKind[kind]}`}
    >
      <div className="text-sm font-medium">{title}</div>
      {message ? <p className="mt-2 max-w-xl text-sm">{message}</p> : null}
    </div>
  );
}