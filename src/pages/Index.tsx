import { useEffect, useState, useMemo, useCallback } from "react";
import { Newspaper } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";
import { NewsFilters } from "@/components/NewsFilters";
import type { NewsArticle } from "@/types/news";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const ITEMS_PER_PAGE = 30;

const Index = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${API}/sources`)
      .then((r) => r.json())
      .then((data) => setSources(data.sources ?? []))
      .catch(() => {});
  }, []);

  const fetchArticles = useCallback(() => {
    setLoading(true);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeSource) params.set("source", activeSource);
    params.set("limit", "200");

    fetch(`${API}/articles?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setArticles(data.articles ?? []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [search, activeSource]);

  useEffect(() => {
    const timer = setTimeout(fetchArticles, 300);
    return () => clearTimeout(timer);
  }, [fetchArticles]);

  useEffect(() => {
    setPage(1);
  }, [search, activeSource, articles.length]);

  const totalPages = Math.max(1, Math.ceil(articles.length / ITEMS_PER_PAGE));

  const paginatedArticles = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return articles.slice(start, start + ITEMS_PER_PAGE);
  }, [articles, page]);

  const showingFrom = articles.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const showingTo = Math.min(page * ITEMS_PER_PAGE, articles.length);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-3">
            <Newspaper className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">News Aggregator</h1>
            <p className="text-muted-foreground">
              Latest news from RSS feeds and HTML sources
            </p>
          </div>
        </div>

        <NewsFilters
          sources={sources}
          search={search}
          onSearchChange={setSearch}
          activeSource={activeSource}
          onSourceChange={setActiveSource}
        />

        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {loading
              ? "Loading articles..."
              : `Showing ${showingFrom}-${showingTo} of ${articles.length} articles`}
          </span>

          {!loading && articles.length > 0 && (
            <span>
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading articles...
          </div>
        ) : articles.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No articles found
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedArticles.map((article) => (
                <NewsCard key={article.id ?? article.url} article={article} />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <span className="min-w-[120px] text-center text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;