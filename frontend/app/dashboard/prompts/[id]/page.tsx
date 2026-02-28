'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, Prompt, PromptVersion, AgentSuggestions, InsightListItem, InsightDetail, MentorReviewResponse } from '@/lib/api';
import EditPromptModal from '@/components/EditPromptModal';
import DeletePromptModal from '@/components/DeletePromptModal';
import AppShell from '@/components/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy, Check, Sparkles, Search, Loader2, ArrowLeft, Edit2, Trash2,
  GitBranch, Wand2, Download, Brain, AlertTriangle, Layers, ChevronDown, ChevronUp,
  Lightbulb, Eye,
} from 'lucide-react';

// ── Diff helper ──────────────────────────────────────────────────────────────
function computeDiff(oldText: string, newText: string): { type: 'same' | 'add' | 'remove'; line: string }[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: { type: 'same' | 'add' | 'remove'; line: string }[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === undefined) { result.push({ type: 'add', line: n }); }
    else if (n === undefined) { result.push({ type: 'remove', line: o }); }
    else if (o === n) { result.push({ type: 'same', line: o }); }
    else { result.push({ type: 'remove', line: o }); result.push({ type: 'add', line: n }); }
  }
  return result;
}

export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = parseInt(params.id as string);

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<AgentSuggestions | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [deletingPrompt, setDeletingPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  // Insights history
  const [insightHistory, setInsightHistory] = useState<InsightListItem[]>([]);
  const [insightDetails, setInsightDetails] = useState<Record<number, InsightDetail>>({});
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingInsightDetail, setLoadingInsightDetail] = useState<number | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  // Mentor review
  const [mentorReview, setMentorReview] = useState<MentorReviewResponse | null>(null);
  const [reviewingMentor, setReviewingMentor] = useState(false);
  const [mentorExpanded, setMentorExpanded] = useState(false);

  // Diff modal
  const [diffVersions, setDiffVersions] = useState<{ older: PromptVersion; newer: PromptVersion } | null>(null);

  useEffect(() => {
    if (promptId) {
      loadPrompt();
      loadInsightHistory();
    }
  }, [promptId]);

  const loadPrompt = async () => {
    try { setLoading(true); setError(null); setPrompt(await apiClient.getPrompt(promptId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load prompt'); }
    finally { setLoading(false); }
  };

  const loadInsightHistory = async () => {
    try {
      setLoadingInsights(true);
      setInsightHistory(await apiClient.getInsights({ prompt_id: promptId }));
    } catch { /* silent */ }
    finally { setLoadingInsights(false); }
  };

  const handleImprove = async () => {
    try {
      setImproving(true); setError(null); setSuccessMessage(null);
      const result = await apiClient.improvePrompt(promptId);
      const latestV = result.versions?.length ? result.versions.reduce((l, c) => c.version > l.version ? c : l) : null;
      const p = latestV?.improved_by || 'Unknown';
      const name = p === 'MockLLMProvider' ? 'Mock' : p === 'GroqProvider' ? 'Groq' : p === 'OpenAIProvider' ? 'OpenAI' : p;
      setSuccessMessage(`Prompt melhorado com ${name}! Nova versão criada.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadPrompt();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to improve prompt'); }
    finally { setImproving(false); }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true); setError(null); setSuggestions(null);
      setSuggestions(await apiClient.analyzePrompt(promptId));
      await loadInsightHistory();
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to analyze prompt'); }
    finally { setAnalyzing(false); }
  };

  const handleMentorReview = async () => {
    if (!latestVersion?.content) return;
    try {
      setReviewingMentor(true); setError(null); setMentorReview(null);
      setMentorReview(await apiClient.mentorReview(latestVersion.content));
      setMentorExpanded(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to get mentor review'); }
    finally { setReviewingMentor(false); }
  };

  const handleExportMd = () => {
    if (!latestVersion?.content) return;
    const blob = new Blob([latestVersion.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(prompt?.name ?? 'prompt').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLatestVersion = (versions: PromptVersion[]): PromptVersion | null =>
    versions.length ? versions.reduce((l, c) => c.version > l.version ? c : l) : null;

  const getTimeAgo = (date: Date): string => {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return `${s}s atrás`;
    if (s < 3600) return `${Math.floor(s / 60)}m atrás`;
    if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
    if (s < 604800) return `${Math.floor(s / 86400)}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const sortedVersions = prompt?.versions ? [...prompt.versions].sort((a, b) => b.version - a.version) : [];
  const latestVersion = prompt?.versions?.length ? getLatestVersion(prompt.versions) : null;

  const categoryToSpec: Record<string, string> = {
    delphi: 'delphi_debug',
    oracle: 'plsql_debug',
    arquitetura: 'delphi_architecture',
  };

  const handleRefineInStudio = (ideaTitle: string) => {
    const spec = categoryToSpec[prompt?.category ?? ''] ?? 'delphi_debug';
    const idea = encodeURIComponent(`${prompt?.name} — ${ideaTitle}`);
    router.push(`/dashboard?studio=open&idea=${idea}&spec=${spec}`);
  };

  const providerBadge = (prov: string | null | undefined) => {
    if (!prov) return null;
    const map: Record<string, { label: string; variant: 'blue' | 'green' | 'secondary' }> = {
      MockLLMProvider: { label: 'Mock', variant: 'secondary' },
      GroqProvider: { label: 'Groq', variant: 'blue' },
      OpenAIProvider: { label: 'OpenAI', variant: 'green' },
    };
    const m = map[prov] ?? { label: prov, variant: 'blue' as const };
    return <Badge variant={m.variant} className="text-[10px]">{m.label}</Badge>;
  };

  const handleCopyContent = async () => {
    if (!latestVersion?.content) return;
    try { await navigator.clipboard.writeText(latestVersion.content); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError('Failed to copy'); }
  };

  if (loading) return <AppShell><div className="max-w-4xl mx-auto py-12 text-center text-muted-foreground text-sm">Carregando prompt...</div></AppShell>;
  if (error && !prompt) return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        <Button variant="secondary" onClick={() => router.push('/dashboard')}>Voltar ao Dashboard</Button>
      </div>
    </AppShell>
  );
  if (!prompt) return <AppShell><div className="max-w-4xl mx-auto py-12 text-center text-muted-foreground text-sm">Prompt não encontrado</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <button onClick={() => router.push('/dashboard')} className="text-xs text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Voltar ao Dashboard
                </button>
                <h1 className="text-xl font-semibold text-foreground truncate">{prompt.name}</h1>
                {prompt.description && <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  {prompt.category && <Badge variant="blue">{prompt.category}</Badge>}
                  {prompt.tags?.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
                </div>
              </div>
              <div className="flex gap-1.5 ml-4 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setEditingPrompt(true)}><Edit2 className="h-3.5 w-3.5 mr-1" /> Editar</Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingPrompt(true)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        {successMessage && <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-400">{successMessage}</div>}

        {/* Content */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Conteúdo Atual {latestVersion && <span className="text-xs font-normal text-muted-foreground">(v{latestVersion.version})</span>}
              </h2>
              <div className="flex gap-1.5 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleCopyContent} disabled={!latestVersion}>
                  {copied ? <><Check className="h-3.5 w-3.5 mr-1" /> Copiado!</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</>}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportMd} disabled={!latestVersion}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Exportar .md
                </Button>
                <Button variant="outline" size="sm" onClick={handleMentorReview} disabled={reviewingMentor || !latestVersion}>
                  {reviewingMentor ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Revisando...</> : <><Brain className="h-3.5 w-3.5 mr-1" /> Mentor</>}
                </Button>
                <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing || !latestVersion}>
                  {analyzing ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Analisando...</> : <><Search className="h-3.5 w-3.5 mr-1" /> Analisar</>}
                </Button>
                <Button size="sm" onClick={handleImprove} disabled={improving || !latestVersion}>
                  {improving ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Melhorando...</> : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Melhorar</>}
                </Button>
              </div>
            </div>
            {latestVersion ? (
              <div className="bg-muted border rounded-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">{providerBadge(latestVersion.improved_by)}</div>
                  <span className="text-xs text-muted-foreground">{new Date(latestVersion.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <pre className="whitespace-pre-wrap text-xs text-foreground font-mono leading-relaxed">{latestVersion.content}</pre>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">Nenhum conteúdo disponível</div>
            )}
          </CardContent>
        </Card>

        {/* Mentor Review */}
        {mentorReview && (
          <Card className="border-purple-500/30">
            <CardContent className="p-5">
              <button
                className="w-full flex items-center justify-between mb-3"
                onClick={() => setMentorExpanded(p => !p)}
              >
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" /> Revisão do Architect Mentor
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); setMentorReview(null); }}>Fechar</Button>
                  {mentorExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>
              {mentorExpanded && (
                <div className="space-y-3">
                  {mentorReview.mentor_advice && (
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Conselho do Mentor</p>
                      <p className="text-xs text-foreground leading-relaxed">{mentorReview.mentor_advice}</p>
                    </div>
                  )}
                  {mentorReview.architect_observation && (
                    <div className="rounded-md border border-purple-500/30 bg-purple-500/5 p-3">
                      <p className="text-xs font-semibold text-purple-400 mb-1 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Observação Arquitetural</p>
                      <p className="text-xs text-foreground leading-relaxed">{mentorReview.architect_observation}</p>
                    </div>
                  )}
                  {mentorReview.risk_alert && (
                    <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
                      <p className="text-xs font-semibold text-yellow-400 mb-1 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Alerta de Risco</p>
                      <p className="text-xs text-foreground leading-relaxed">{mentorReview.risk_alert}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {suggestions && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Resultado da Análise</h2>
                <Button variant="ghost" size="sm" onClick={() => setSuggestions(null)}>Fechar</Button>
              </div>
              <Tabs defaultValue="improvements">
                <TabsList>
                  <TabsTrigger value="improvements">Ideias ({suggestions.improvement_ideas.length})</TabsTrigger>
                  <TabsTrigger value="patterns">Padrões ({suggestions.reusable_patterns.length})</TabsTrigger>
                  <TabsTrigger value="warnings">Avisos ({suggestions.warnings.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="improvements" className="space-y-2">
                  {suggestions.improvement_ideas.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhuma ideia de melhoria.</p>}
                  {suggestions.improvement_ideas.map((idea, i) => (
                    <div key={i} className="border rounded-md p-3 hover:border-primary/50 transition-colors">
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                        <h4 className="font-semibold text-sm">{idea.title}</h4>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={idea.priority === 'high' ? 'red' : idea.priority === 'medium' ? 'yellow' : 'blue'} className="text-[10px]">{idea.priority}</Badge>
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-amber-400 hover:text-amber-300 px-2" onClick={() => handleRefineInStudio(idea.title)}>
                            <Wand2 className="h-3 w-3 mr-1" /> Refinar no Studio
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-foreground mb-1">{idea.description}</p>
                      <p className="text-xs text-muted-foreground italic">Raciocínio: {idea.reasoning}</p>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="patterns" className="space-y-2">
                  {suggestions.reusable_patterns.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhum padrão detectado.</p>}
                  {suggestions.reusable_patterns.map((p, i) => (
                    <div key={i} className="border rounded-md p-3 hover:border-primary/50 transition-colors">
                      <h4 className="font-semibold text-sm mb-1">{p.name}</h4>
                      <p className="text-xs text-foreground mb-2">{p.description}</p>
                      <pre className="bg-muted rounded p-2 border text-xs font-mono mb-2">{p.example}</pre>
                      <div className="flex flex-wrap gap-1">{p.use_cases.map((uc, j) => <Badge key={j} variant="blue" className="text-[10px]">{uc}</Badge>)}</div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="warnings" className="space-y-2">
                  {suggestions.warnings.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhum aviso.</p>}
                  {suggestions.warnings.map((w, i) => (
                    <div key={i} className={`border rounded-md p-3 ${w.severity === 'error' ? 'border-destructive/50 bg-destructive/5' : w.severity === 'warning' ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-primary/50 bg-primary/5'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium">{w.message}</p>
                        <Badge variant={w.severity === 'error' ? 'red' : w.severity === 'warning' ? 'yellow' : 'blue'} className="text-[10px]">{w.severity}</Badge>
                      </div>
                      {w.suggestion && <p className="text-xs text-muted-foreground mt-1">Sugestão: {w.suggestion}</p>}
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Insight History */}
        {(insightHistory.length > 0 || loadingInsights) && (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Lightbulb className="h-4 w-4 text-primary" /> Histórico de Análises
                {insightHistory.length > 0 && <Badge variant="secondary" className="text-[10px]">{insightHistory.length}</Badge>}
              </h2>
              {loadingInsights ? (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              ) : (
                <div className="space-y-2">
                  {insightHistory.map(insight => {
                    const isExpanded = expandedInsight === insight.id;
                    return (
                      <div key={insight.id} className="border rounded-md overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent transition-colors text-left"
                          onClick={async () => {
                            const next = isExpanded ? null : insight.id;
                            setExpandedInsight(next);
                            if (next && !insightDetails[insight.id]) {
                              try {
                                setLoadingInsightDetail(insight.id);
                                const d = await apiClient.getInsight(insight.id);
                                setInsightDetails(prev => ({ ...prev, [insight.id]: d }));
                              } catch { /* silent */ }
                              finally { setLoadingInsightDetail(null); }
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">{new Date(insight.created_at).toLocaleDateString('pt-BR')}</span>
                            {insight.improvement_count > 0 && <Badge variant="blue" className="text-[10px]">{insight.improvement_count} ideia{insight.improvement_count !== 1 ? 's' : ''}</Badge>}
                            {insight.pattern_count > 0 && <Badge variant="secondary" className="text-[10px]">{insight.pattern_count} padrão{insight.pattern_count !== 1 ? 'ões' : ''}</Badge>}
                            {insight.warning_count > 0 && <Badge variant="yellow" className="text-[10px]">{insight.warning_count} aviso{insight.warning_count !== 1 ? 's' : ''}</Badge>}
                          </div>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-3 border-t pt-3">
                            {loadingInsightDetail === insight.id ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...
                              </div>
                            ) : (() => {
                              const d = insightDetails[insight.id];
                              const ideas = (d?.improvement_ideas ?? []) as Record<string, unknown>[];
                              const patterns = (d?.reusable_patterns ?? []) as Record<string, unknown>[];
                              const warnings = (d?.warnings ?? []) as Record<string, unknown>[];
                              return (
                                <>
                                  {ideas.length > 0 && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ideias</p>
                                      {ideas.map((idea, i) => (
                                        <div key={i} className="text-xs text-foreground border rounded p-2">
                                          <span className="font-medium">{String(idea.title ?? '')}</span>
                                          {idea.description && <p className="text-muted-foreground mt-0.5">{String(idea.description)}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {patterns.length > 0 && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Padrões</p>
                                      {patterns.map((p, i) => (
                                        <div key={i} className="text-xs text-foreground border rounded p-2">
                                          <span className="font-medium">{String(p.name ?? '')}</span>
                                          {p.description && <p className="text-muted-foreground mt-0.5">{String(p.description)}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {warnings.length > 0 && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avisos</p>
                                      {warnings.map((w, i) => (
                                        <div key={i} className="text-xs text-yellow-400 border border-yellow-500/30 rounded p-2">{String(w.message ?? '')}</div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Version History with Diff */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <GitBranch className="h-4 w-4 text-muted-foreground" /> Histórico de Versões
            </h2>
            {sortedVersions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma versão disponível</div>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-0">
                  {sortedVersions.map((version, idx) => {
                    const isLatest = version.version === latestVersion?.version;
                    const date = new Date(version.created_at);
                    const olderVersion = sortedVersions[idx + 1];
                    return (
                      <div key={version.id} className="relative flex items-start pb-5 last:pb-0">
                        <div className="relative z-10 flex-shrink-0">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isLatest ? 'bg-primary border-primary' : 'bg-card border-border'}`}>
                            {isLatest && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <div className="bg-muted border rounded-md p-3 hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">v{version.version}</span>
                                {isLatest && <Badge variant="blue" className="text-[10px]">HEAD</Badge>}
                                {providerBadge(version.improved_by)}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-mono">{getTimeAgo(date)}</span>
                                {olderVersion && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    onClick={() => setDiffVersions({ older: olderVersion, newer: version })}
                                  >
                                    Comparar com v{olderVersion.version}
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="bg-card border rounded p-2 mt-2">
                              <pre className="whitespace-pre-wrap text-xs text-foreground font-mono leading-relaxed">{version.content}</pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diff Modal */}
        {diffVersions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDiffVersions(null)}>
            <div className="bg-card border rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-sm font-semibold">Comparar v{diffVersions.older.version} → v{diffVersions.newer.version}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500/20 border border-green-500/50 rounded inline-block" /> Adicionado</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded inline-block" /> Removido</span>
                  <Button variant="ghost" size="sm" onClick={() => setDiffVersions(null)}>Fechar</Button>
                </div>
              </div>
              <div className="overflow-y-auto p-4">
                <pre className="text-xs font-mono leading-relaxed">
                  {computeDiff(diffVersions.older.content, diffVersions.newer.content).map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.type === 'add' ? 'bg-green-500/10 text-green-400 border-l-2 border-green-500 pl-2' :
                        line.type === 'remove' ? 'bg-red-500/10 text-red-400 border-l-2 border-red-500 pl-2' :
                        'text-foreground pl-2'
                      }
                    >
                      {line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '}{line.line}
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          </div>
        )}

        {editingPrompt && prompt && (
          <EditPromptModal
            prompt={{ id: prompt.id, name: prompt.name, description: prompt.description, category: prompt.category, tags: prompt.tags, created_at: prompt.created_at, updated_at: prompt.updated_at }}
            isOpen onClose={() => setEditingPrompt(false)} onSuccess={() => { setEditingPrompt(false); loadPrompt(); }}
          />
        )}
        {deletingPrompt && prompt && (
          <DeletePromptModal
            prompt={{ id: prompt.id, name: prompt.name, description: prompt.description, category: prompt.category, tags: prompt.tags, created_at: prompt.created_at, updated_at: prompt.updated_at }}
            isOpen onClose={() => setDeletingPrompt(false)} onSuccess={() => router.push('/dashboard')}
          />
        )}
      </div>
    </AppShell>
  );
}
