const API_BASE = import.meta.env.VITE_API_URL || "";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);

  if (!res.ok) {
    let message = `HTTP ${res.status}`;

    try {
      const body = await res.json();
      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (typeof body?.message === "string") {
        message = body.message;
      }
    } catch {
      // Ignore non-JSON error bodies.
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

function buildQuery(params: object): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

export interface PageMeta {
  limit: number;
  offset: number;
  total: number;
  hasNext: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: PageMeta;
}

export interface RunSummary {
  runId: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  windowHours: number;
  minClusterSize: number;
  minSamples: number;
  articleCount: number;
  clusterCount: number;
  noiseCount: number;
  largestClusterSize: number;
  largestClusterRatio: number;
  noiseRatio: number;
  maxPerSource: number | null;
  parentLineageEdgeCount: number;
  childLineageEdgeCount: number;
}

export interface PipelineRun {
  id: number;
  jobType: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  relatedRunId: number | null;
  error: string | null;
  meta: Record<string, unknown>;
}

export interface PipelineRunsParams {
  limit?: number;
  offset?: number;
  job_type?: string;
  status?: string;
}

export interface ArticlePreview {
  id: number;
  title: string | null;
  url: string | null;
  published: string | null;
  source: string | null;
}

export interface ClusterDetail {
  id: string;
  clusterId: number;
  runId: number;
  clusterLabel: number;
  displayName?: string | null;
  size: number;
  representativeArticleId: number | null;
  representativeTitle: string | null;
  createdAt: string;
  incomingEdgeCount: number;
  outgoingEdgeCount: number;
  nameShort?: string | null;
  nameTitle?: string | null;
  languageCode?: string | null;
  tags?: string[] | null;
  concepts?: string[] | null;
  articles: ArticlePreview[];
}

export interface LineageEdge {
  edgeId: number;
  parentRunId: number;
  childRunId: number;
  parentClusterId: number;
  childClusterId: number;
  sourceNodeId: string;
  targetNodeId: string;
  centroidSimilarity: number;
  articleOverlapRatio: number;
  articleOverlapCount: number;
  parentSize: number;
  childSize: number;
  score: number;
  matchedAt: string;
}

export interface ClusterMeta {
  representativeArticleId?: number | null;
  representativeTitle?: string | null;
  displayName?: string | null;
  nameShort?: string | null;
  nameTitle?: string | null;
  languageCode?: string | null;
  tags?: string[] | null;
  concepts?: string[] | null;
  [key: string]: unknown;
}

export interface SankeyNode {
  id: string;
  label: string | null;
  runId: number;
  clusterId: number;
  clusterLabel: number;
  size: number;
  depth: number;
  meta: ClusterMeta;
}

export interface SankeyLink {
  id: string;
  edgeId: number;
  source: string;
  target: string;
  value: number;
  score: number;
  overlapRatio: number;
  overlapCount: number;
  similarity: number;
}

export interface SankeyResponse {
  nodes: SankeyNode[];
  links: SankeyLink[];
  stats: {
    nodeCount: number;
    linkCount: number;
    runCount: number;
    truncated: boolean;
  };
}

export interface GraphPositionHint {
  lane: number;
  rank: number;
  x: number;
  y: number;
}

export interface GraphNode {
  id: string;
  type: "cluster";
  runId: number;
  clusterId: number;
  clusterLabel: number;
  label: string | null;
  size: number;
  group: string;
  positionHint: GraphPositionHint;
  styleHints: {
    radius?: number;
    weight?: number;
    colorKey?: string;
    [key: string]: unknown;
  };
  meta: ClusterMeta;
}

export interface GraphEdge {
  id: string;
  type: "lineage";
  edgeId: number;
  source: string;
  target: string;
  label: string;
  score: number;
  similarity: number;
  overlapRatio: number;
  overlapCount: number;
  styleHints: {
    width?: number;
    opacity?: number;
    [key: string]: unknown;
  };
}

export interface GraphGroup {
  id: string;
  type: "run";
  label: string;
  runId: number;
  nodeCount: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    truncated: boolean;
  };
}

export interface EulerPairDetail {
  edgeId: number;
  parent: {
    id: string;
    runId: number;
    clusterId: number;
    clusterLabel: number;
    label: string | null;
    size: number;
  };
  child: {
    id: string;
    runId: number;
    clusterId: number;
    clusterLabel: number;
    label: string | null;
    size: number;
  };
  overlap: {
    count: number;
    ratio: number;
    parentCoverage: number;
    childCoverage: number;
    unionSize: number;
    jaccard: number;
  };
  metrics: {
    similarity: number;
    score: number;
  };
  circles: {
    parentArea: number;
    childArea: number;
    intersectionArea: number;
  };
  labels: {
    title: string;
    subtitle: string;
    explanation: string;
  };
}

export interface RunsParams {
  status?: string;
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
}

export interface ClustersParams {
  run_id?: number;
  min_size?: number;
  limit?: number;
  offset?: number;
}

export interface ClusterDetailParams {
  include_articles?: boolean;
  articles_limit?: number;
}

export interface LineageEdgesParams {
  parent_run_id?: number;
  child_run_id?: number;
  parent_cluster_id?: number;
  child_cluster_id?: number;
  min_score?: number;
  min_similarity?: number;
  min_overlap_ratio?: number;
  min_overlap_count?: number;
  limit?: number;
  offset?: number;
  sort?:
    | "score_desc"
    | "score_asc"
    | "similarity_desc"
    | "overlap_desc"
    | "matched_at_desc";
}

export interface SankeyParams {
  start_run_id: number;
  end_run_id: number;
  min_score?: number;
  min_similarity?: number;
  min_overlap_ratio?: number;
  min_overlap_count?: number;
  link_value?: "overlap_count" | "score" | "child_size" | "parent_size";
}

export interface GraphParams {
  start_run_id: number;
  end_run_id: number;
  min_score?: number;
  min_similarity?: number;
  min_overlap_ratio?: number;
  min_overlap_count?: number;
  max_nodes?: number;
  max_edges?: number;
}

export const clusteringKeys = {
  all: ["clustering"] as const,
  runs: (params: RunsParams = {}) => [...clusteringKeys.all, "runs", params] as const,
  clusters: (params: ClustersParams = {}) =>
    [...clusteringKeys.all, "clusters", params] as const,
  cluster: (clusterId: number, params: ClusterDetailParams = {}) =>
    [...clusteringKeys.all, "clusters", clusterId, params] as const,
  lineageEdges: (params: LineageEdgesParams = {}) =>
    [...clusteringKeys.all, "lineage", "edges", params] as const,
  sankey: (params: SankeyParams) =>
    [...clusteringKeys.all, "views", "sankey", params] as const,
  graph: (params: GraphParams) =>
    [...clusteringKeys.all, "views", "graph", params] as const,
  euler: (edgeId: number) =>
    [...clusteringKeys.all, "views", "euler", edgeId] as const,
  pipelineRuns: (params: PipelineRunsParams = {}) =>
    [...clusteringKeys.all, "pipeline", "runs", params] as const,
};

export function getClusteringRuns(params: RunsParams = {}) {
  return fetchJson<PaginatedResponse<RunSummary>>(
    `/v1/clustering/runs${buildQuery(params)}`
  );
}

export function getClusters(params: ClustersParams = {}) {
  return fetchJson<PaginatedResponse<ClusterDetail>>(
    `/v1/clustering/clusters${buildQuery(params)}`
  );
}

export function getClusterDetail(clusterId: number, params: ClusterDetailParams = {}) {
  return fetchJson<ClusterDetail>(
    `/v1/clustering/clusters/${clusterId}${buildQuery(params)}`
  );
}

export function getLineageEdges(params: LineageEdgesParams = {}) {
  return fetchJson<PaginatedResponse<LineageEdge>>(
    `/v1/clustering/lineage/edges${buildQuery(params)}`
  );
}

export function getSankeyView(params: SankeyParams) {
  return fetchJson<SankeyResponse>(
    `/v1/clustering/views/sankey${buildQuery(params)}`
  );
}

export function getGraphView(params: GraphParams) {
  return fetchJson<GraphResponse>(
    `/v1/clustering/views/graph${buildQuery(params)}`
  );
}

export function getEulerPairDetail(edgeId: number) {
  return fetchJson<EulerPairDetail>(
    `/v1/clustering/views/euler/pair/${edgeId}`
  );
}

export function getPipelineRuns(params: PipelineRunsParams = {}) {
  return fetchJson<PaginatedResponse<PipelineRun>>(
    `/v1/clustering/pipeline/runs${buildQuery(params)}`
  );
}