import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);
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
      .then((json: Topic[]) => setTopics(json))
      .catch((err) => setError(err.message || "Failed to load topics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6">Loading topics...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-end justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Topics</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Latest clustering run: {topics[0]?.started_at ?? "—"}
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            Back to Home
          </Link>
        </div>

        <div className="space-y-4">
          {topics.map((topic) => (
            <article
              key={topic.cluster_id}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-4 text-sm text-muted-foreground">
                <span>Cluster #{topic.cluster_id}</span>
                <span>{topic.size} articles</span>
              </div>

              <h2 className="text-lg font-medium leading-snug">
                {topic.representative_title}
              </h2>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}