'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  apiClient,
  PromptListItem,
  SemanticSearchResult,
  GroupedPromptsResponse,
  PromptStats,
  InsightListItem,
} from '@/lib/api';
import { setAgentRunning } from '@/lib/agentStatus';
import NewPromptForm from '@/components/NewPromptForm';
import CategorySection from '@/components/CategorySection';
import EditPromptModal from '@/components/EditPromptModal';
import DeletePromptModal from '@/components/DeletePromptModal';
import AppShell from '@/components/AppShell';
import PromptCard from '@/components/PromptCard';
import PromptTable from '@/components/PromptTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Bot,
  Grid,
  LayoutGrid,
  Table2,
  FileText,
  TrendingUp,
  Sparkles,
  GitBranch,
  Star,
  Lightbulb,
  ArrowRight,
  Clock,
  Loader2,
  X,
} from 'lucide-react';
import CategoryBadge from '@/components/CategoryBadge';
import { cn } from '@/lib/utils';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 2) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  if (hours < 24) return `há ${hours}h`;
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [groupedPrompts, setGroupedPrompts] = useState<GroupedPromptsResponse | null>(null);
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improvingId, setImprovingId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'grouped'>('grid');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [editingPrompt, setEditingPrompt] = useState<PromptListItem | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<PromptListItem | null>(null);
  const [runningWorker, setRunningWorker] = useState(false);
  const [stats, setStats] = useState<PromptStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [unreadInsights, setUnreadInsights] = useState<InsightListItem[]>([]);

  // Studio query params: ?studio=open&idea=...&spec=...
  const studioOpen = searchParams.get('studio') === 'open';

  useEffect(() => {
    if (studioOpen) router.replace('/dashboard/studio?' + searchParams.toString().replace('studio=open&', '').replace('studio=open', ''));
  }, [studioOpen, router, searchParams]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    await Promise.all([loadPrompts(), loadStats(), loadInsights()]);
  };

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const data = await apiClient.getPromptStats();
      setStats(data);
    } catch { /* silent */ }
    finally { setLoadingStats(false); }
  };

  const loadInsights = async () => {
    try {
      const items = await apiClient.getInsights({ unread_only: true, limit: 5 });
      setUnreadInsights(items);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearching(false); return; }
    const id = setTimeout(async () => {
      try {
        setSearching(true); setError(null);
        const results = await apiClient.searchPrompts(searchQuery.trim(), 10);
        setSearchResults(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha na busca');
        setSearchResults([]);
      } finally { setSearching(false); }
    }, 500);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const loadPrompts = async () => {
    try {
      setLoading(true); setError(null);
      const [promptsData, groupedData] = await Promise.all([
        apiClient.getPrompts(),
        apiClient.getGroupedPrompts(),
      ]);
      setPrompts(promptsData);
      setGroupedPrompts(groupedData);
    } catch (err) {
      let msg = 'Falha ao carregar prompts';
      if (err instanceof Error) {
        msg = err.message;
        if (msg.includes('Database connection failed') || msg.includes('503'))
          msg = 'Falha na conexão com o banco. Verifique DATABASE_URL e PostgreSQL.';
      }
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleImprove = async (id: number) => {
    try {
      setImprovingId(id); setError(null); setSuccessMessage(null);
      const result = await apiClient.improvePrompt(id);
      const latestVersion = result.versions?.length
        ? result.versions.reduce((l, c) => c.version > l.version ? c : l)
        : null;
      const provider = latestVersion?.improved_by || 'Unknown';
      const name = provider === 'MockLLMProvider' ? 'Mock'
        : provider === 'GroqProvider' ? 'Groq'
        : provider === 'OpenAIProvider' ? 'OpenAI'
        : provider;
      setSuccessMessage(`Prompt melhorado com ${name}!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadPrompts();
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao melhorar prompt'); }
    finally { setImprovingId(null); }
  };

  const handleFormSuccess = () => {
    setShowNewForm(false);
    loadPrompts();
    loadStats();
  };

  const handleRunWorker = async () => {
    try {
      setRunningWorker(true); setError(null);
      setAgentRunning(true);
      await apiClient.runAgentWorker(5);
      setSuccessMessage('Análise do Agent concluída!');
      setTimeout(() => setSuccessMessage(null), 5000);
      await Promise.all([loadPrompts(), loadStats(), loadInsights()]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao executar agent'); }
    finally { setRunningWorker(false); setAgentRunning(false); }
  };

  const isSearchMode = searchQuery.trim().length > 0;
  const basePrompts = isSearchMode ? searchResults.map(r => r.prompt) : prompts;
  const displayPrompts = showFavoritesOnly ? basePrompts.filter(p => p.is_favorite) : basePrompts;
  const totalPages = Math.ceil(displayPrompts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPrompts = displayPrompts.slice(startIndex, endIndex);
  const recentPrompts = [...prompts].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 4);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, viewMode, showFavoritesOnly]);

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{getGreeting()}</h2>
            <p className="text-sm text-muted-foreground capitalize">{today}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={() => setShowNewForm(true)} disabled={showNewForm}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Prompt
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/studio">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Abrir Studio
              </Link>
            </Button>
            <Button variant="secondary" size="sm" onClick={handleRunWorker} disabled={runningWorker}>
              {runningWorker
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analisando...</>
                : <><Bot className="h-3.5 w-3.5 mr-1.5" /> Executar Agent</>}
            </Button>
          </div>
        </div>

        {/* ── STATS ── */}
        {!loadingStats && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: FileText,   label: 'Prompts',    value: stats.total_prompts ?? 0,   color: 'text-primary',      bg: 'bg-primary/10' },
              { icon: TrendingUp, label: 'Analisados', value: stats.total_analyzed ?? 0,  color: 'text-purple-400',   bg: 'bg-purple-500/10' },
              { icon: Sparkles,   label: 'Melhorados', value: stats.total_improved ?? 0,  color: 'text-green-400',    bg: 'bg-green-500/10' },
              { icon: GitBranch,  label: 'Versões',    value: stats.total_versions ?? 0,  color: 'text-orange-400',   bg: 'bg-orange-500/10' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <Card key={label} className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── QUICK ACCESS ── */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Insights pendentes */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-400" />
                    Insights pendentes
                  </CardTitle>
                  {unreadInsights.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                      {unreadInsights.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {unreadInsights.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum insight pendente.</p>
                ) : (
                  <ul className="space-y-2">
                    {unreadInsights.slice(0, 3).map(insight => (
                      <li key={insight.id}>
                        <Link
                          href={`/dashboard/insights`}
                          className="flex items-center justify-between group text-xs hover:text-primary transition-colors"
                        >
                          <span className="text-muted-foreground group-hover:text-primary truncate">
                            {insight.improvement_count + insight.pattern_count + insight.warning_count} itens · {formatRelativeDate(insight.created_at)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0 ml-2" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/dashboard/insights"
                  className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver todos os insights <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>

            {/* Prompts recentes */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Atividade recente
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {recentPrompts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum prompt ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {recentPrompts.map(p => (
                      <li key={p.id}>
                        <Link
                          href={`/dashboard/prompts/${p.id}`}
                          className="flex items-center gap-2 group"
                        >
                          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate flex-1">
                            {p.name}
                          </span>
                          {p.category && <CategoryBadge category={p.category} size="sm" />}
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {formatRelativeDate(p.updated_at)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/dashboard/prompts"
                  className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver todos os prompts <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── NEW PROMPT FORM ── */}
        {showNewForm && (
          <Card className="border-primary/30 shadow-sm">
            <CardContent className="p-4">
              <NewPromptForm
                onSuccess={handleFormSuccess}
                onCancel={() => setShowNewForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {/* ── MESSAGES ── */}
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}
        {successMessage && (
          <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-400 flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* ── TOOLBAR ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
            )}
            {searchQuery && !searching && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Favorites toggle */}
          <Button
            variant={showFavoritesOnly ? 'default' : 'secondary'}
            size="sm"
            className="h-9"
            onClick={() => setShowFavoritesOnly(p => !p)}
          >
            <Star className={cn('h-3.5 w-3.5 mr-1.5', showFavoritesOnly && 'fill-current')} />
            Favoritos
          </Button>

          {/* View toggle */}
          {!isSearchMode && (
            <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
              {([['grouped', Grid, 'Agrupado'], ['grid', LayoutGrid, 'Grid'], ['table', Table2, 'Tabela']] as const).map(([mode, Icon, title]) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  title={title}
                  onClick={() => setViewMode(mode)}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Search result count */}
        {isSearchMode && !searching && (
          <p className="text-xs text-muted-foreground -mt-3">
            {searchResults.length > 0
              ? `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} para "${searchQuery}"`
              : `Nenhum resultado para "${searchQuery}"`}
          </p>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando prompts...
          </div>
        )}

        {/* ── EMPTY ── */}
        {!loading && !isSearchMode && prompts.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
            <p className="text-sm text-muted-foreground">Nenhum prompt ainda. Crie seu primeiro prompt!</p>
            <Button size="sm" onClick={() => setShowNewForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Criar Prompt
            </Button>
          </div>
        )}
        {!loading && isSearchMode && !searching && searchResults.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">Nenhum resultado encontrado.</div>
        )}

        {/* ── GROUPED VIEW ── */}
        {!loading && !isSearchMode && viewMode === 'grouped' && groupedPrompts && (
          <div className="space-y-4">
            {groupedPrompts.by_category.filter(c => c.category !== null).map((category) => (
              <CategorySection
                key={category.category || 'uncategorized'}
                category={category}
                allPrompts={prompts}
                onPromptUpdated={loadPrompts}
              />
            ))}
            {groupedPrompts.by_category.find(c => c.category === null) && (
              <CategorySection
                category={groupedPrompts.by_category.find(c => c.category === null)!}
                allPrompts={prompts}
                onPromptUpdated={loadPrompts}
              />
            )}
          </div>
        )}

        {/* ── GRID VIEW ── */}
        {!loading && displayPrompts.length > 0 && (isSearchMode || viewMode === 'grid') && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginatedPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onEdit={setEditingPrompt}
                  onDelete={setDeletingPrompt}
                  onImprove={handleImprove}
                  improving={improvingId === prompt.id}
                  similarity={isSearchMode ? searchResults.find(r => r.prompt.id === prompt.id)?.similarity : undefined}
                  onFavoriteToggled={(updated) =>
                    setPrompts(prev => prev.map(p => p.id === updated.id ? { ...p, is_favorite: updated.is_favorite } : p))
                  }
                />
              ))}
            </div>
            {!isSearchMode && totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {startIndex + 1}–{Math.min(endIndex, displayPrompts.length)} de {displayPrompts.length}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    Anterior
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let num: number;
                    if (totalPages <= 5) num = i + 1;
                    else if (currentPage <= 3) num = i + 1;
                    else if (currentPage >= totalPages - 2) num = totalPages - 4 + i;
                    else num = currentPage - 2 + i;
                    return (
                      <Button
                        key={num}
                        variant={currentPage === num ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(num)}
                      >
                        {num}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TABLE VIEW ── */}
        {!loading && displayPrompts.length > 0 && viewMode === 'table' && !isSearchMode && (
          <>
            <PromptTable
              prompts={paginatedPrompts}
              onEdit={setEditingPrompt}
              onDelete={setDeletingPrompt}
              onImprove={handleImprove}
              improvingIds={improvingId ? new Set([improvingId]) : new Set()}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {startIndex + 1}–{Math.min(endIndex, displayPrompts.length)} de {displayPrompts.length}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Próximo</Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── MODALS ── */}
        {editingPrompt && (
          <EditPromptModal
            prompt={editingPrompt}
            isOpen={true}
            onClose={() => setEditingPrompt(null)}
            onSuccess={() => { setEditingPrompt(null); loadPrompts(); }}
          />
        )}
        {deletingPrompt && (
          <DeletePromptModal
            prompt={deletingPrompt}
            isOpen={true}
            onClose={() => setDeletingPrompt(null)}
            onSuccess={() => { setDeletingPrompt(null); loadPrompts(); }}
          />
        )}
      </div>
    </AppShell>
  );
}
