import { ExternalLink, Clock, Rss } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SemanticScaleWidget } from "@/components/SemanticScaleWidget";

import { cn } from "@/lib/utils";
import type { NewsArticle } from "@/types/news";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-En", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceBadgeVariant(source: string): "default" | "secondary" | "outline" {
  if (source.toLowerCase().includes("rss")) return "default";
  if (source.toLowerCase().includes("html")) return "secondary";
  return "outline";
}

export function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col border border-border/70 bg-background",
        "shadow-none transition-colors duration-200",
        "hover:border-foreground/60 hover:bg-muted/40"
      )}
    >
      <CardHeader className="pb-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <Badge
            variant={sourceBadgeVariant(article.source)}
            className="border border-border/70 bg-background/80 px-2 py-0.5 text-[11px] uppercase tracking-[0.08em]"
          >
            <Rss className="mr-1 h-3 w-3" />
            {article.source}
          </Badge>

          {/* {article.primary_scale_id ? (
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Semantic profile
            </span>
          ) : null} */}
        </div>

        <CardTitle className="text-[17px] font-semibold leading-snug tracking-tight">
          {article.title}
        </CardTitle>

        <CardDescription className="mt-1 flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDate(article.published)}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pt-1">
        {article.description ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {article.description}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-end justify-between gap-3 border-t border-border/50 pt-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-[12px] uppercase tracking-[0.14em] text-primary hover:underline"
        >
          more..
          <ExternalLink className="h-3 w-3" />
        </a>

        <SemanticScaleWidget
          scales={article.semantic_scales}
          primaryScaleId={article.primary_scale_id}
        />
      </CardFooter>
    </Card>
  );
}