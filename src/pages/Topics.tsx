import { useEffect, useState } from "react";

type Topic = {
  cluster_id: number;
  run_id: number;
  label: number;
  size: number;
  representative_article_id: number;
  representative_title: string;
  started_at: string;
  finished_at: string;
};

type TopicsResponse = {
  topics: Topic[];
  total: number;
};

export default function Topics() {
  const [data, setData] = useState<TopicsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/topics")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message || "Failed to load topics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading topics...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-semibold">Topics</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Latest clustering run: {data?.topics?.[0]?.started_at ?? "—"}
      </p>

      <div className="space-y-4">
        {data?.topics.map((topic) => (
          <article
            key={topic.cluster_id}
            className="rounded-lg border border-border bg-background p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Cluster #{topic.cluster_id}
              </span>
              <span className="text-sm font-medium">
                {topic.size} articles
              </span>
            </div>

            <h2 className="text-lg font-medium leading-snug">
              {topic.representative_title}
            </h2>
          </article>
        ))}
      </div>
    </main>
  );
}