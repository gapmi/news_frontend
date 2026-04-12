import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  sources: string[];
  activeSource: string | null;
  onSourceChange: (v: string | null) => void;
}

export function NewsFilters({ search, onSearchChange, sources, activeSource, onSourceChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by titles and description..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={activeSource === null ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onSourceChange(null)}
        >
          All sources
        </Badge>
        {sources.map((s) => (
          <Badge
            key={s}
            variant={activeSource === s ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onSourceChange(s)}
          >
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}