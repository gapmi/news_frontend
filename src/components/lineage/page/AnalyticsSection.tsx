import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnalyticsSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function AnalyticsSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: AnalyticsSectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-4 border-b px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight md:text-lg">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      <div className={cn("px-5 py-5", contentClassName)}>{children}</div>
    </section>
  );
}