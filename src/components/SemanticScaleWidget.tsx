import { useEffect, useMemo, useState } from "react";
import type { SemanticScale } from "@/types/news";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ScaleMeta = {
  label: string;
  leftLabel: string;
  rightLabel: string;
};

const SCALE_META: Record<string, ScaleMeta> = {
  urgent_vs_analytical: {
    label: "Urgency",
    leftLabel: "Analytical",
    rightLabel: "Urgent",
  },
  practical_vs_background: {
    label: "Impact",
    leftLabel: "Background",
    rightLabel: "Practical",
  },
  local_vs_global: {
    label: "Scale",
    leftLabel: "Local",
    rightLabel: "Global",
  },
  markets_vs_politics: {
    label: "Focus",
    leftLabel: "Markets",
    rightLabel: "Politics",
  },
  certainty_vs_uncertainty: {
    label: "Clarity",
    leftLabel: "Certain",
    rightLabel: "Uncertain",
  },
  risk_vs_opportunity: {
    label: "Outlook",
    leftLabel: "Risk",
    rightLabel: "Opportunity",
  },
  conflict_vs_cooperation: {
    label: "Dynamics",
    leftLabel: "Conflict",
    rightLabel: "Cooperation",
  },
  trend_vs_background: {
    label: "Trend",
    leftLabel: "Background",
    rightLabel: "Trending",
  },
};

function getPrimaryScale(
  scales: SemanticScale[],
  primaryScaleId?: string | null,
): SemanticScale | null {
  if (!scales.length) return null;

  if (primaryScaleId) {
    const found = scales.find((s) => s.scale_id === primaryScaleId);
    if (found) return found;
  }

  return [...scales].sort((a, b) => b.strength - a.strength)[0] ?? null;
}

export function SemanticScaleWidget({
  scales,
  primaryScaleId,
}: {
  scales?: SemanticScale[];
  primaryScaleId?: string | null;
}) {
  const safeScales = scales ?? [];

  const primary = useMemo(
    () => getPrimaryScale(safeScales, primaryScaleId),
    [safeScales, primaryScaleId],
  );

  const [selectedId, setSelectedId] = useState(primary?.scale_id ?? "");

  useEffect(() => {
    if (primary?.scale_id) {
      setSelectedId(primary.scale_id);
    } else if (safeScales[0]?.scale_id) {
      setSelectedId(safeScales[0].scale_id);
    } else {
      setSelectedId("");
    }
  }, [primary?.scale_id, safeScales]);

  const selected =
    safeScales.find((scale) => scale.scale_id === selectedId) ?? primary;

  if (!selected) return null;

  const meta = SCALE_META[selected.scale_id] ?? {
    label: selected.scale_id,
    leftLabel: "Left",
    rightLabel: "Right",
  };

  const zoomFactor = 2;
  const visualScore = Math.max(-1, Math.min(1, selected.score * zoomFactor));
  const pointerLeftPercent = ((visualScore + 1) / 2) * 100;
  const pointerLeft = `${pointerLeftPercent}%`;

  const centerPercent = 50;
  const baseRadiusPx = 7;
  const tailWidth = Math.abs(pointerLeftPercent - centerPercent);

  const tailStyle =
    pointerLeftPercent >= centerPercent
      ? {
          left: "50%",
          width: `${tailWidth}%`,
          clipPath: "polygon(0 50%, 100% 0, 100% 100%)",
          background:
            
            "linear-gradient(to right, rgba(100,116,139,0.55), rgba(148,163,184,0))",
        }
      : {
          left: `${pointerLeftPercent}%`,
          width: `${tailWidth}%`,
          clipPath: "polygon(0 0, 0 100%, 100% 50%)",
          background:
            "linear-gradient(to right, rgba(148,163,184,0), rgba(100,116,139,0.55))",
        };

  return (
    <div className="ml-auto w-[168px] shrink-0">
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue placeholder={meta.label} />
        </SelectTrigger>
        <SelectContent>
          {safeScales.map((scale) => {
            const itemMeta = SCALE_META[scale.scale_id] ?? {
              label: scale.scale_id,
              leftLabel: "Left",
              rightLabel: "Right",
            };

            return (
              <SelectItem key={scale.scale_id} value={scale.scale_id}>
                {itemMeta.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <div className="mt-2 space-y-1">
        <div className="relative h-4">
          <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted" />
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />

          {tailWidth > 0.5 ? (
            <div
              className="absolute top-1/2 h-3 -translate-y-1/2"
              style={tailStyle}
            />
          ) : null}

          <div
            className={cn(
              "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
              "border-2 border-background bg-foreground shadow-sm",
            )}
            style={{ left: pointerLeft, marginLeft: 0 }}
            title={`${meta.label}: ${selected.score.toFixed(2)}`}
          />

          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/70 bg-background/80"
            style={{ left: pointerLeft, width: baseRadiusPx * 2, height: baseRadiusPx * 2 }}
            aria-hidden="true"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="max-w-[64px] truncate">{meta.leftLabel}</span>
          <span className="max-w-[64px] truncate text-right">
            {meta.rightLabel}
          </span>
        </div>

        <div className="text-center text-[10px] text-muted-foreground">
          {selected.score > 0 ? "+" : ""}
          {selected.score.toFixed(2)}
        </div>
      </div>
    </div>
  );
}