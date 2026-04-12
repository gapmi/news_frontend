import { useEffect, useState, useCallback } from "react";
import { Newspaper } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";
import { NewsFilters } from "@/components/NewsFilters";
import type { NewsArticle } from "@/types/news";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Index = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Загружаем список источников один раз
  useEffect(() => {
    fetch(`${API}/sources`)
      .then((r) => r.json())
      .then((data) => setSources(data.sources))
      .catch(() => {});
  }, []);

  // Загружаем статьи при изменении фильтров
  const fetchArticles = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeSource) params.set("source", activeSource);
    params.set("limit", "200");

    fetch(`${API}/articles?${params}`)
      .then((r) => r.json())
      .then((data) => setArticles(data.articles))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, activeSource]);

  useEffect(() => {
    const timer = setTimeout(fetchArticles, 300); // debounce для поиска
    return () => clearTimeout(timer);
  }, [fetchArticles]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">News Aggregator</h1>
              <p className="text-sm text-muted-foreground">
                {articles.length} articles collected
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <NewsFilters
          search={search}
          onSearchChange={setSearch}
          sources={sources}
          activeSource={activeSource}
          onSourceChange={setActiveSource}
        />

        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading...</p>
        ) : articles.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nothing was found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a, i) => (
              <NewsCard key={a.url + i} article={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;