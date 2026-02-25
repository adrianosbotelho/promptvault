import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export type PromptCategory = 'delphi' | 'oracle' | 'arquitetura';
export type PromptTag = 'implementation' | 'debug' | 'architecture' | 'performance' | 'analysis' | 'improvement';

export interface PromptVersion {
  id: number;
  version: number;
  content: string;
  embedding?: number[] | null;
  improved_by?: string | null;
  created_at: string;
}

export interface PromptListItem {
  id: number;
  name: string;
  description?: string | null;
  category?: PromptCategory | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
  latest_version?: number | null;
  provider?: string | null;
}

export interface Prompt {
  id: number;
  name: string;
  description?: string | null;
  category?: PromptCategory | null;
  tags?: PromptTag[] | null;
  created_at: string;
  updated_at: string;
  versions: PromptVersion[];
}

export interface SemanticSearchResult {
  prompt: PromptListItem;
  version?: PromptVersion;
  similarity: number;
  matched_content?: string;
}

export interface GroupedPromptsByCategory {
  category: string | null;
  prompts: PromptListItem[];
  count: number;
}

export interface GroupedPromptsByTag {
  tag: string;
  prompts: PromptListItem[];
  count: number;
}

export interface GroupedPromptsResponse {
  by_category: GroupedPromptsByCategory[];
  by_tag: GroupedPromptsByTag[];
  total_prompts: number;
  total_with_category: number;
  total_with_tags: number;
}

export interface PromptStats {
  total_prompts: number;
  total_by_category: Record<string, number>;
  total_analyzed: number;
  total_improved: number;
  total_versions: number;
  uncategorized_count: number;
}

export interface CreatePromptRequest {
  name: string;
  title?: string;
  description?: string;
  content: string;
  category?: string;
  tags?: string[];
}

export interface UpdatePromptRequest {
  name?: string;
  title?: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
}

export interface ImprovementIdea {
  title: string;
  description: string;
  priority: string;
  reasoning: string;
}

export interface ReusablePattern {
  name: string;
  description: string;
  example: string;
  use_cases: string[];
}

export interface Warning {
  severity: string;
  message: string;
  suggestion?: string | null;
}

export interface AgentSuggestions {
  improvement_ideas: ImprovementIdea[];
  reusable_patterns: ReusablePattern[];
  warnings: Warning[];
}

export interface InsightListItem {
  id: number;
  prompt_id: number;
  created_at: string;
  read_at?: string | null;
  improvement_count: number;
  pattern_count: number;
  warning_count: number;
  is_read: boolean;
  improvement_ideas: Record<string, unknown>[];
  reusable_patterns: Record<string, unknown>[];
  warnings: Record<string, unknown>[];
}

export interface WorkerConfig {
  enabled: boolean;
  interval_minutes: number;
  max_prompts: number;
  max_retries: number;
  use_free_apis_only: boolean;
  updated_at?: string | null;
}

export interface ContextAnalyzeResponse {
  detected_mode: string;
  confidence: number;
  domain: string;
  subdomain: string;
  suggested_prompts: SemanticSearchResult[];
  total_suggestions: number;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      const { logout } = await import('./auth');
      logout();
    }
    throw new Error('Unauthorized');
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const apiClient = {
  getPrompts(): Promise<PromptListItem[]> {
    return apiFetch('/api/v1/prompts');
  },

  getPrompt(id: number): Promise<Prompt> {
    return apiFetch(`/api/v1/prompts/${id}`);
  },

  createPrompt(data: CreatePromptRequest): Promise<Prompt> {
    return apiFetch('/api/v1/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePrompt(id: number, data: UpdatePromptRequest): Promise<Prompt> {
    return apiFetch(`/api/v1/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deletePrompt(id: number): Promise<void> {
    return apiFetch(`/api/v1/prompts/${id}`, { method: 'DELETE' });
  },

  improvePrompt(id: number): Promise<Prompt> {
    return apiFetch(`/api/v1/prompts/${id}/improve`, { method: 'POST' });
  },

  getGroupedPrompts(): Promise<GroupedPromptsResponse> {
    return apiFetch('/api/v1/prompts/grouped');
  },

  searchPrompts(query: string, topK: number = 5): Promise<SemanticSearchResult[]> {
    return apiFetch(`/api/v1/prompts/search?q=${encodeURIComponent(query)}&top_k=${topK}`);
  },

  getPromptStats(): Promise<PromptStats> {
    return apiFetch('/api/v1/prompts/stats');
  },

  analyzePrompt(promptId: number): Promise<AgentSuggestions> {
    return apiFetch(`/api/v1/agent/analyze/${promptId}`, { method: 'POST' });
  },

  runAgentWorker(maxPrompts?: number): Promise<Record<string, unknown>> {
    const params = maxPrompts ? `?max_prompts=${maxPrompts}` : '';
    return apiFetch(`/api/v1/agent/run${params}`, { method: 'POST' });
  },

  getInsights(params?: { prompt_id?: number; unread_only?: boolean; limit?: number; offset?: number }): Promise<InsightListItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.prompt_id) searchParams.set('prompt_id', String(params.prompt_id));
    if (params?.unread_only) searchParams.set('unread_only', 'true');
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return apiFetch(`/api/v1/insights${qs ? `?${qs}` : ''}`);
  },

  markInsightAsRead(insightId: number): Promise<Record<string, unknown>> {
    return apiFetch(`/api/v1/insights/${insightId}/read`, { method: 'POST' });
  },

  getWorkerConfig(): Promise<WorkerConfig> {
    return apiFetch('/api/v1/admin/worker/config');
  },

  updateWorkerConfig(config: Partial<WorkerConfig>): Promise<WorkerConfig> {
    return apiFetch('/api/v1/admin/worker/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  updatePromptCategory(id: number, data: { category?: string; tags?: string[] }): Promise<Prompt> {
    return apiFetch(`/api/v1/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  analyzeContext(text: string): Promise<ContextAnalyzeResponse> {
    return apiFetch('/api/v1/context/analyze', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
};
