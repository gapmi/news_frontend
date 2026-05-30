import TagLanguageToggle from "@/components/lineage/TagLanguageToggle";

interface LineageRightPanelProps {
  tagLanguage: "RU" | "EN";
  onChangeTagLanguage: (value: "RU" | "EN") => void;
}

function RightPanelSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-background">
      <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </div>
        <h3 className="mt-2 text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export default function LineageRightPanel({
  tagLanguage,
  onChangeTagLanguage,
}: LineageRightPanelProps) {
  return (
    <div className="space-y-4">
      <RightPanelSection
        eyebrow="Display"
        title="Label settings"
        description="Choose which tag language is used in supporting lineage UI."
      >
        <div className="flex flex-col gap-3">
          <TagLanguageToggle
            value={tagLanguage}
            onChange={onChangeTagLanguage}
          />

          <div className="rounded-xl border border-dashed border-border/70 px-3 py-3 text-sm text-muted-foreground">
            English labels are usually easier for cluster inspection and avoid inflected forms in dense analytical views.
          </div>
        </div>
      </RightPanelSection>
    </div>
  );
}