interface GeoSlice {
  code: string;
  share: number;
  color: string;
}

interface GeoBreakdownCardProps {
  items: GeoSlice[];
}

export default function GeoBreakdownCard({ items }: GeoBreakdownCardProps) {
  const total = items.reduce((sum, item) => sum + item.share, 0) || 1;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-medium">Geographic breakdown</h3>

      <div className="mt-4 flex items-center gap-4">
        <div
          className="h-28 w-28 rounded-full"
          style={{
            background: `conic-gradient(${items
              .map((item, index) => {
                const previous = items
                  .slice(0, index)
                  .reduce((sum, current) => sum + current.share, 0);
                const start = (previous / total) * 100;
                const end = ((previous + item.share) / total) * 100;
                return `${item.color} ${start}% ${end}%`;
              })
              .join(", ")})`,
          }}
        />
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.code} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium">{item.code}</span>
              <span className="text-muted-foreground">{item.share}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}