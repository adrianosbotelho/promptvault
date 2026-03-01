import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export type PromptCategory = 'delphi' | 'oracle' | 'arquitetura' | 'python' | 'sql' | 'api';
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
  is_favorite?: boolean;
  quality_score?: number;
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
}

export interface InsightDetail {
  id: number;
  prompt_id: number;
  created_at: string;
  read_at?: string | null;
  improvement_ideas: Record<string, unknown>[] | null;
  reusable_patterns: Record<string, unknown>[] | null;
  warnings: Record<string, unknown>[] | null;
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

export interface MentorSummaryItem {
  text: string;
  prompt_id?: number;
  prompt_name?: string;
  created_at?: string;
}

export interface MentorSummaryResponse {
  recent_observations: MentorSummaryItem[];
  architectural_alerts: MentorSummaryItem[];
  detected_patterns: MentorSummaryItem[];
}

export interface MentorReviewResponse {
  mentor_advice: string;
  architect_observation: string;
  risk_alert: string;
}

export interface ArchitectProfile {
  id: number;
  name?: string | null;
  preferred_patterns?: string[] | null;
  recurring_decisions?: string[] | null;
  common_domains?: string[] | null;
  risk_tendencies?: string[] | null;
  optimization_focus?: string[] | null;
  notes?: string | null;
}

export interface PromptTemplate {
  id: number;
  name: string;
  description?: string | null;
  content: string;
  variables?: string[] | null;
  specialization?: string | null;
  category?: string | null;
  created_at: string;
}

export interface ConvertResult {
  markdown: string;
  filename: string;
  detected_format: string;
  char_count: number;
}

export interface UrlConvertResult {
  markdown: string;
  url: string;
  title?: string | null;
  char_count: number;
}

export interface YoutubeConvertResult {
  markdown: string;
  video_id: string;
  url: string;
  char_count: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
}

export interface TagDistribution {
  tag: string;
  count: number;
}

export interface QualityOverTime {
  date: string;
  avg_score: number;
  prompt_count: number;
}

export interface AnalyticsData {
  category_distribution: CategoryDistribution[];
  tag_distribution: TagDistribution[];
  quality_over_time: QualityOverTime[];
  total_prompts: number;
  total_favorites: number;
  total_versions: number;
  total_insights: number;
  avg_quality_score: number;
  prompts_improved_pct: number;
}

export interface IntegrationConfig {
  id: number;
  integration_type: 'github' | 'webhook' | 'slack' | 'discord' | 'notion';
  name?: string | null;
  config: Record<string, string>;
  enabled: boolean;
  events?: string[] | null;
}

export interface IntegrationConfigCreate {
  integration_type: string;
  name?: string;
  config: Record<string, string>;
  enabled: boolean;
  events?: string[] | null;
}

export interface ExportResult {
  success: boolean;
  message: string;
  url?: string | null;
}

export interface ArchitectProfileUpdate {
  name?: string;
  preferred_patterns?: string[];
  recurring_decisions?: string[];
  common_domains?: string[];
  risk_tendencies?: string[];
  optimization_focus?: string[];
  notes?: string;
}

export interface SpecialistBuildResponse {
  markdown_prompt: string;
  reasoning: string;
  applied_specialist: string;
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

  getInsight(insightId: number): Promise<InsightDetail> {
    return apiFetch(`/api/v1/insights/${insightId}`);
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

  getMentorSummary(domain?: string): Promise<MentorSummaryResponse> {
    const qs = domain ? `?domain=${encodeURIComponent(domain)}` : '';
    return apiFetch(`/api/v1/mentor/summary${qs}`);
  },

  buildExpertPrompt(idea: string, specialization: string): Promise<SpecialistBuildResponse> {
    return apiFetch('/api/v1/specialist/build', {
      method: 'POST',
      body: JSON.stringify({ idea, specialization }),
    });
  },

  mentorReview(text: string): Promise<MentorReviewResponse> {
    return apiFetch('/api/v1/mentor/review', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  specialistFeedback(specialization: string, useful: boolean): Promise<{ recorded: boolean; message: string }> {
    return apiFetch('/api/v1/specialist/feedback', {
      method: 'POST',
      body: JSON.stringify({ specialization, useful }),
    });
  },

  toggleFavorite(id: number): Promise<PromptListItem> {
    return apiFetch(`/api/v1/prompts/${id}/favorite`, { method: 'PUT' });
  },

  getProfile(): Promise<ArchitectProfile> {
    return apiFetch('/api/v1/profile');
  },

  updateProfile(data: ArchitectProfileUpdate): Promise<ArchitectProfile> {
    return apiFetch('/api/v1/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Templates
  getTemplates(): Promise<PromptTemplate[]> {
    return apiFetch('/api/v1/templates');
  },

  createTemplate(data: { name: string; description?: string; content: string; specialization?: string; category?: string }): Promise<PromptTemplate> {
    return apiFetch('/api/v1/templates', { method: 'POST', body: JSON.stringify(data) });
  },

  deleteTemplate(id: number): Promise<void> {
    return apiFetch(`/api/v1/templates/${id}`, { method: 'DELETE' });
  },

  useTemplate(id: number, variables: Record<string, string>): Promise<{ content: string; missing_variables: string[] }> {
    return apiFetch(`/api/v1/templates/${id}/use`, { method: 'POST', body: JSON.stringify({ variables }) });
  },

  // MarkItDown file conversion
  async convertFile(file: File): Promise<ConvertResult> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/api/v1/convert/file`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (response.status === 401) throw new Error('Unauthorized');
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || `Falha na conversão: ${response.status}`);
    }
    return response.json();
  },

  // Integrations
  getIntegrations(): Promise<IntegrationConfig[]> {
    return apiFetch('/api/v1/integrations');
  },

  createIntegration(data: IntegrationConfigCreate): Promise<IntegrationConfig> {
    return apiFetch('/api/v1/integrations', { method: 'POST', body: JSON.stringify(data) });
  },

  updateIntegration(id: number, data: IntegrationConfigCreate): Promise<IntegrationConfig> {
    return apiFetch(`/api/v1/integrations/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteIntegration(id: number): Promise<void> {
    return apiFetch(`/api/v1/integrations/${id}`, { method: 'DELETE' });
  },

  githubExport(promptId: number): Promise<ExportResult> {
    return apiFetch(`/api/v1/integrations/github/export/${promptId}`, { method: 'POST' });
  },

  githubValidate(token: string, owner: string, repo: string): Promise<ExportResult> {
    return apiFetch('/api/v1/integrations/github/validate', { method: 'POST', body: JSON.stringify({ token, owner, repo }) });
  },

  notionExport(promptId: number): Promise<ExportResult> {
    return apiFetch(`/api/v1/integrations/notion/export/${promptId}`, { method: 'POST' });
  },

  notionValidate(token: string, database_id: string): Promise<ExportResult> {
    return apiFetch('/api/v1/integrations/notion/validate', { method: 'POST', body: JSON.stringify({ token, database_id }) });
  },

  webhookTest(cfgId: number): Promise<ExportResult> {
    return apiFetch(`/api/v1/integrations/webhook/test/${cfgId}`, { method: 'POST' });
  },

  // Fork / duplicate a prompt
  forkPrompt(id: number): Promise<Prompt> {
    return apiFetch(`/api/v1/prompts/${id}/fork`, { method: 'POST' });
  },

  // Export collection
  exportPromptsUrl(format: 'json' | 'zip', favoritesOnly: boolean): string {
    return `${API_URL}/api/v1/prompts/export?format=${format}&favorites_only=${favoritesOnly}`;
  },

  // URL to Markdown
  convertUrl(url: string): Promise<UrlConvertResult> {
    return apiFetch('/api/v1/convert/url', { method: 'POST', body: JSON.stringify({ url }) });
  },

  // YouTube transcript to Markdown
  convertYoutube(url: string, includeTimestamps: boolean = false, language: string = 'pt'): Promise<YoutubeConvertResult> {
    return apiFetch('/api/v1/convert/youtube', {
      method: 'POST',
      body: JSON.stringify({ url, include_timestamps: includeTimestamps, language }),
    });
  },

  // Analytics
  getAnalytics(): Promise<AnalyticsData> {
    return apiFetch('/api/v1/analytics');
  },
};
