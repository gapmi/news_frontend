import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { NewsCard } from "@/components/NewsCard";
import type { NewsArticle } from "@/types/news";

type TopicMeta = {
  cluster_id: number;
  run_id: number;
  label: number;
  size: number;
  representative_article_id: number;
  representative_title: string;
  started_at: string;
  finished_at: string;
};

type TopicDetailResponse = {
  topic: TopicMeta;
  articles: NewsArticle[];
  total: number;
};

export default function TopicDetail() {
  const { clusterId } = useParams();
  const [data, setData] = useState<TopicDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clusterId) {
      setError("Missing cluster id");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/topics/${clusterId}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        console.log("topic detail response:", json);
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load topic");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [clusterId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 border-b pb-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Link
              to="/topics"
              className="inline-flex rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              Back to Topics
            </Link>

            <Link
              to="/"
              className="inline-flex rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              Home
            </Link>
          </div>

          {loading && <div className="p-4">Loading topic...</div>}

          {error && <div className="p-4 text-red-600">Error: {error}</div>}

          {!loading && !error && data?.topic && (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">
                {data.topic.representative_title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Cluster #{data.topic.cluster_id} · {data.total} articles
              </p>
            </>
          )}
        </div>

        {!loading && !error && data && (
          <div className="space-y-6">
            {data.articles.map((article) => (
              <NewsCard key={article.id ?? article.url} article={article} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}