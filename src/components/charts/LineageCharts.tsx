import { useMemo } from "react";
import type { LineageEdge } from "@/api/clustering";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

type Props = {
  edges: LineageEdge[];
  parentRunId: number | null;
  childRunId: number | null;
};

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

export default function LineageCharts({
  edges,
  parentRunId,
  childRunId,
}: Props) {
  const topScoreData = useMemo(() => {
    return [...edges]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((edge) => ({
        id: `#${edge.edgeId}`,
        pair: `P${edge.parentClusterId}→C${edge.childClusterId}`,
        score: Number(edge.score.toFixed(4)),
        similarity: Number(edge.centroidSimilarity.toFixed(4)),
        overlapRatio: Number(edge.articleOverlapRatio.toFixed(4)),
        overlapCount: edge.articleOverlapCount,
        label: `${edge.parentClusterId} → ${edge.childClusterId}`,
      }))
      .reverse();
  }, [edges]);

  const scatterData = useMemo(() => {
    return edges.map((edge) => ({
      edgeId: edge.edgeId,
      x: Number(edge.centroidSimilarity.toFixed(4)),
      y: Number(edge.articleOverlapRatio.toFixed(4)),
      z: Math.max(edge.articleOverlapCount, 1),
      score: Number(edge.score.toFixed(4)),
      overlapCount: edge.articleOverlapCount,
      label: `${edge.parentClusterId} → ${edge.childClusterId}`,
    }));
  }, [edges]);

  if (!parentRunId || !childRunId) {
    return null;
  }

  return (
    <section className="mb-6 grid gap-6 xl:grid-cols-2">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-medium">Top edges by score</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pair {parentRunId} → {childRunId}, top 10 lineage matches by score.
        </p>

        <div className="mt-4 h-[320px]">
          {topScoreData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topScoreData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 1]} />
                <YAxis
                  type="category"
                  dataKey="pair"
                  width={90}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatNumber(value, 4),
                    name,
                  ]}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? `Edge ${row.id} · ${row.label}` : "";
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {topScoreData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={entry.score >= 0.75 ? "#2563eb" : "#60a5fa"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No chart data for this pair.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-medium">Similarity vs overlap</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each dot is one lineage edge; larger dots mean more overlapping articles.
        </p>

        <div className="mt-4 h-[320px]">
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Similarity"
                  domain={[0, 1]}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Overlap ratio"
                  domain={[0, 1]}
                  tick={{ fontSize: 12 }}
                />
                <ZAxis type="number" dataKey="z" range={[60, 320]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: number, name: string) => [
                    formatNumber(value, 4),
                    name,
                  ]}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload;
                    return row
                      ? `Edge #${row.edgeId} · ${row.label} · overlap ${row.overlapCount}`
                      : "";
                  }}
                />
                <Scatter data={scatterData} fill="#7c3aed" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No chart data for this pair.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}