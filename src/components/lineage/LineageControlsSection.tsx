import AnalyticsSection from "@/components/lineage/page/AnalyticsSection";
import RunTimelineSlider from "@/components/lineage/RunTimelineSlider";

interface LineageControlsSectionProps {
  minScore: number;
  onChangeMinScore: (value: number) => void;
  timelineRunIds: number[];
  parentRunId: number | null;
  onSelectRun: (runId: number) => void;
}

export default function LineageControlsSection({
  minScore,
  onChangeMinScore,
  timelineRunIds,
  parentRunId,
  onSelectRun,
}: LineageControlsSectionProps) {
  return (
    <AnalyticsSection
      title="Controls"
      description="Select the active anchor run, adjacent pair, and score threshold for the analysis window."
      actions={
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Min score</span>
          <input
            className="w-24 rounded-md border bg-background px-3 py-2"
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={minScore}
            onChange={(event) => {
              onChangeMinScore(Number(event.target.value));
            }}
          />
        </label>
      }
    >
      <RunTimelineSlider
        runIds={timelineRunIds}
        selectedRunId={parentRunId}
        onSelectRun={onSelectRun}
      />
    </AnalyticsSection>
  );
}