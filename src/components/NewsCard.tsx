import { ExternalLink, Clock, Rss } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NewsArticle } from "@/types/news";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", {
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
    console.log(article)
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={sourceBadgeVariant(article.source)}>
            <Rss className="w-3 h-3 mr-1" />
            {article.source}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-snug">{article.title}</CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs">
          <Clock className="w-3 h-3" />
          {formatDate(article.published)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed">{article.description}</p>
      </CardContent>
      <CardFooter>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          more..
          <ExternalLink className="w-3 h-3" />
        </a>
      </CardFooter>
    </Card>
  );
}
