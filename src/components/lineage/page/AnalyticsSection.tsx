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
        "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm",
        className,
      )}
    >
      <div className="border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
              Analysis block
            </div>
            <h2 className="mt-2 text-base font-semibold tracking-tight md:text-lg">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>

      <div className={cn("px-5 py-5", contentClassName)}>{children}</div>
    </section>
  );
}