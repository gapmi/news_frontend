import type { ArticlePreview } from "@/api/clustering";

interface ClusterArticlesListProps {
  articles: ArticlePreview[];
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function ClusterArticlesList({
  articles,
}: ClusterArticlesListProps) {
  if (articles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
        No articles available for this cluster.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {articles.map((article) => (
        <article
          key={article.id}
          className="rounded-xl border border-border/70 bg-background px-4 py-4"
        >
          <h3 className="text-sm font-semibold leading-6 text-foreground">
            {article.title ?? "Untitled article"}
          </h3>

          <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-3 sm:gap-y-1">
            <span>{article.source ?? "Unknown source"}</span>
            <span>{formatDateTime(article.published)}</span>
          </div>

          {article.url ? (
            <div className="mt-3">
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Open article
              </a>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}