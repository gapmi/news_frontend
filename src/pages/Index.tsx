import { useEffect, useState, useMemo } from "react";
import { Newspaper } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";
import { NewsFilters } from "@/components/NewsFilters";
import type { NewsArticle } from "@/types/news";

const Index = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [search, setSearch] = useState("");
  const [activeSource, setActiveSource] = useState<string | null>(null);

  useEffect(() => {

    fetch("/news_output.json")
      .then((r) => r.json())
      .then((data: NewsArticle[]) => setArticles(data))
      .catch(() => {});
  }, []);

  const sources = useMemo(
    () => [...new Set(articles.map((a) => a.source))],
    [articles]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return articles.filter((a) => {
      const matchSource = !activeSource || a.source === activeSource;
      const matchSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q);
      return matchSource && matchSearch;
    });
  }, [articles, search, activeSource]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (Array.isArray(data)) setArticles(data);
      } catch {
        /* ignore */
      }
    };
    reader.readAsText(file);
  };

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
          onFileUpload={handleFileUpload}
        />

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Nothing was found.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a, i) => (
              <NewsCard key={a.url + i} article={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
