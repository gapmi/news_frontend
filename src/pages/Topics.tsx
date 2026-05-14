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
    const load = async () => {
      try {
        const res = await fetch("/api/topics");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        console.log("topics response:", json);

        const normalizedTopics: Topic[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.topics)
          ? json.topics
          : [];

        setTopics(normalizedTopics);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load topics");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-end justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Topics</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Total topics: {topics.length}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
                to="/articles"
                className="inline-flex rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
                View Articles
            </Link>
            <Link
                to="/about"
                className="inline-flex rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
                About
            </Link>
            </div>
        </div>

        {loading && <div className="p-4">Loading topics...</div>}

        {error && <div className="p-4 text-red-600">Error: {error}</div>}

        {!loading && !error && topics.length === 0 && (
          <div className="p-4 text-muted-foreground">No topics found.</div>
        )}

        {!loading && !error && topics.length > 0 && (
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
                <Link
                    to={`/topics/${topic.cluster_id}`}
                    className="transition-colors hover:text-primary"
                >
                    {topic.representative_title}
                </Link>
                </h2>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}