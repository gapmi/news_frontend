interface TagLanguageToggleProps {
  value: "RU" | "EN";
  onChange: (value: "RU" | "EN") => void;
}

export default function TagLanguageToggle({
  value,
  onChange,
}: TagLanguageToggleProps) {
  return (
    <div className="inline-flex rounded-lg border bg-background p-1">
      {(["RU", "EN"] as const).map((item) => {
        const active = item === value;

        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={
              active
                ? "rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                : "rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            }
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}