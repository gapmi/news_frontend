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
    <Card className="flex h-full flex-col transition-shadow duration-200 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant={sourceBadgeVariant(article.source)}>
            <Rss className="mr-1 h-3 w-3" />
            {article.source}
          </Badge>
        </div>

        <CardTitle className="text-lg leading-snug">{article.title}</CardTitle>

        <CardDescription className="flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          {formatDate(article.published)}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {article.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {article.description}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-end gap-3">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
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