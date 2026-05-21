interface StoryHeaderCardProps {
  title: string;
  subtitle: string;
}

export default function StoryHeaderCard({
  title,
  subtitle,
}: StoryHeaderCardProps) {
  return (
    <section className="rounded-xl border bg-card px-5 py-4 shadow-sm">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        Storyline
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
    </section>
  );
}