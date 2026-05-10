import * as React from "react";

export function ScientificFoundationSection() {
  return (
    <section
      id="scientific-foundation"
      className="border-t border-border/60 bg-muted/30"
    >
      <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Scientific Foundation: Semantic Terrain Analysis
        </h2>

        <p className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          How we turn the news stream into an analyzable signal
        </p>

        <div className="mt-8 space-y-6 text-base leading-relaxed text-muted-foreground">
          <section>
            <h3 className="text-lg font-semibold text-foreground">Overview</h3>
            <p className="mt-2">
              Our platform treats the global news stream not as a collection of
              isolated articles, but as a continuous information signal. Using
              modern language models and mathematical analysis, we construct a
              semantic “map” of the media landscape that reveals structure,
              trends, and anomalies in real time.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground">
              Phase 1 — Deep Semantic Embedding
            </h3>
            <p className="mt-2">
              At the core of the system are Transformer models that project each
              article into a high‑dimensional vector space (384 dimensions). In
              this space, texts with similar meaning, tone, and context end up
              close to each other, even if they use different wording or come
              from different languages. This allows us to capture intent and
              nuance far beyond what traditional keyword‑based search can see.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground">
              Phase 2 — Multidimensional Semantic Scales
            </h3>
            <p className="mt-2">
              On top of the embedding space we introduce a set of analytical
              scales — for example,{" "}
              <span className="whitespace-nowrap">
                Urgent ↔ Analytical
              </span>
              ,{" "}
              <span className="whitespace-nowrap">
                Risk ↔ Opportunity
              </span>
              ,{" "}
              <span className="whitespace-nowrap">
                Conflict ↔ Cooperation
              </span>
              ,{" "}
              <span className="whitespace-nowrap">
                Local ↔ Global
              </span>
              . For each article, we compute its position along these axes by
              measuring distances to carefully chosen semantic reference points.
              The result is a kind of semantic topographic map: you see not only
              what is being discussed, but also how it is framed and how it fits
              into broader narratives.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground">
              Future Research — Signal Processing on Embeddings
            </h3>
            <p className="mt-2">
              Building on the founder’s background in terrain approximation and
              signal processing, we are exploring Fourier‑like (FFT) analysis of
              time series of embedding vectors. In this view, the evolving news
              stream becomes a signal in a high‑dimensional space.
            </p>
            <p className="mt-2">
              The goal is to isolate{" "}
              <span className="font-semibold">
                high‑energy harmonic components
              </span>{" "}
              of that signal — stable, recurring patterns that correspond to
              genuine global trends — and to filter out short‑lived
              informational noise. This hybrid approach, combining deep semantic
              modeling with classical signal analysis, is designed to build a
              robust, noise‑resistant framework for real‑time geopolitical and
              social monitoring.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}