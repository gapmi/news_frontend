import TagLanguageToggle from "@/components/lineage/TagLanguageToggle";
import GeoBreakdownCard from "@/components/lineage/GeoBreakdownCard";
import PolarityCard from "@/components/lineage/PolarityCard";

interface LineageRightPanelProps {
  tagLanguage: "RU" | "EN";
  onChangeTagLanguage: (value: "RU" | "EN") => void;
}

export default function LineageRightPanel({
  tagLanguage,
  onChangeTagLanguage,
}: LineageRightPanelProps) {
  const tags =
    tagLanguage === "RU"
      ? ["#микрочипы", "#санкции", "#тайвань", "#экспорт", "#поставки"]
      : ["#microchips", "#sanctions", "#taiwan", "#exports", "#supplychain"];

  return (
    <aside className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Tag language</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Filter visible tags to one language
            </p>
          </div>
          <TagLanguageToggle value={tagLanguage} onChange={onChangeTagLanguage} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border bg-background px-3 py-1 text-xs text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <GeoBreakdownCard
        items={[
          { code: "CN", share: 40, color: "#0f766e" },
          { code: "RU", share: 30, color: "#2563eb" },
          { code: "PL", share: 20, color: "#7c3aed" },
          { code: "OTH", share: 10, color: "#94a3b8" },
        ]}
      />

      <PolarityCard
        leftTitle="Chinese media frames chip controls as economic containment."
        leftMeta="Source cluster: CN · cosine outlier A"
        rightTitle="Polish coverage stresses strategic security and supply risks."
        rightMeta="Source cluster: PL · cosine outlier B"
      />
    </aside>
  );
}