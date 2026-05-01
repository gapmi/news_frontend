export interface SemanticScale {
  scale_id: string;
  score: number;
  strength: number;
}

export interface NewsArticle {
  id?: number;
  title: string;
  url: string;
  source: string;
  description: string;
  published: string;
  collected_at?: string;
  primary_scale_id?: string | null;
  semantic_scales?: SemanticScale[];
}