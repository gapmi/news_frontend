import { useEffect, useMemo, useState } from "react";
import type { SemanticScale } from "@/types/news";
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
    const found = scales.find((s) => s.id === primaryScaleId);
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

  const [selectedId, setSelectedId] = useState(primary?.id ?? "");

  // синхронизируем выбранную шкалу, когда поменялись данные статьи
  useEffect(() => {
    if (primary?.id) {
      setSelectedId(primary.id);
    } else if (safeScales[0]?.id) {
      setSelectedId(safeScales[0].id);
    } else {
      setSelectedId("");
    }
  }, [primary?.id, safeScales]);

  const selected =
    safeScales.find((scale) => scale.id === selectedId) ?? primary;

  if (!selected) return null;

  const meta = SCALE_META[selected.id] ?? {
    label: selected.id,
    leftLabel: "Left",
    rightLabel: "Right",
  };

  const pointerLeft = `${((selected.score + 1) / 2) * 100}%`;

  return (
    <div className="ml-auto w-[168px] shrink-0">
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {safeScales.map((scale) => {
            const itemMeta = SCALE_META[scale.id] ?? {
              label: scale.id,
              leftLabel: "Left",
              rightLabel: "Right",
            };

            return (
              <SelectItem key={scale.id} value={scale.id}>
                {itemMeta.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <div className="mt-2 space-y-1">
        <div className="relative h-2 rounded-full bg-muted">
          <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-primary shadow-sm"
            style={{ left: pointerLeft }}
            title={`${meta.label}: ${selected.score.toFixed(2)}`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="max-w-[64px] truncate">{meta.leftLabel}</span>
          <span className="max-w-[64px] truncate text-right">
            {meta.rightLabel}
          </span>
        </div>
      </div>
    </div>
  );
}