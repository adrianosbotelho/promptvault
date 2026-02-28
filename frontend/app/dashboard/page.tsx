'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, PromptListItem, SemanticSearchResult, GroupedPromptsResponse, PromptStats, ContextAnalyzeResponse } from '@/lib/api';
import NewPromptForm from '@/components/NewPromptForm';
import CategorySection from '@/components/CategorySection';
import EditPromptModal from '@/components/EditPromptModal';
import DeletePromptModal from '@/components/DeletePromptModal';
import AppShell from '@/components/AppShell';
import PromptCard from '@/components/PromptCard';
import PromptTable from '@/components/PromptTable';
import SmartInput from '@/components/SmartInput';
import PromptStudio from '@/components/PromptStudio';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, RefreshCw, Bot, Grid, LayoutGrid, Table2, FileText, TrendingUp, Sparkles, GitBranch, FolderOpen, Star } from 'lucide-react';

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
  const [detectedContext, setDetectedContext] = useState<ContextAnalyzeResponse | null>(null);
  const [newPromptInitialData, setNewPromptInitialData] = useState<{ content?: string; category?: string } | null>(null);
  const smartInputRef = useRef<{ getValue: () => string; getContext: () => ContextAnalyzeResponse | null; clear: () => void } | null>(null);

  // Studio query params: ?studio=open&idea=...&spec=...
  const studioOpen = searchParams.get('studio') === 'open';
  const studioIdea = searchParams.get('idea') ?? undefined;
  const studioSpec = searchParams.get('spec') ?? undefined;

  const handleContextDetected = useCallback((context: ContextAnalyzeResponse) => {
    setDetectedContext(context);
  }, []);

  const handleSmartInputNewPrompt = () => {
    const value = smartInputRef.current?.getValue() || '';
    const context = smartInputRef.current?.getContext();
    let category: string | undefined;
    if (context && context.confidence > 0.3) {
      if (context.detected_mode === 'dev_delphi') category = 'delphi';
      else if (context.detected_mode === 'dev_oracle') category = 'oracle';
      else if (context.detected_mode === 'architecture') category = 'arquitetura';
    }
    setNewPromptInitialData({ content: value, category });
    setShowNewForm(true);
  };

  useEffect(() => { loadPrompts(); loadStats(); }, []);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const data = await apiClient.getPromptStats();
      setStats(data);
    } catch (err) { console.error('Failed to load statistics:', err); }
    finally { setLoadingStats(false); }
  };

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearching(false); return; }
    const timeoutId = setTimeout(async () => {
      try {
        setSearching(true); setError(null);
        const results = await apiClient.searchPrompts(searchQuery.trim(), 10);
        setSearchResults(results); setSearching(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search prompts');
        setSearchResults([]); setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadPrompts = async () => {
    try {
      setLoading(true); setError(null);
      const [promptsData, groupedData] = await Promise.all([apiClient.getPrompts(), apiClient.getGroupedPrompts()]);
      setPrompts(promptsData); setGroupedPrompts(groupedData);
    } catch (err) {
      let msg = 'Failed to load prompts';
      if (err instanceof Error) {
        msg = err.message;
        if (msg.includes('Database connection failed') || msg.includes('503'))
          msg = 'Database connection failed. Check DATABASE_URL and PostgreSQL.';
      }
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleImprove = async (id: number) => {
    try {
      setImprovingId(id); setError(null); setSuccessMessage(null);
      const result = await apiClient.improvePrompt(id);
      const latestVersion = result.versions?.length ? result.versions.reduce((l, c) => c.version > l.version ? c : l) : null;
      const provider = latestVersion?.improved_by || 'Unknown';
      const name = provider === 'MockLLMProvider' ? 'Mock' : provider === 'GroqProvider' ? 'Groq' : provider === 'OpenAIProvider' ? 'OpenAI' : provider;
      setSuccessMessage(`Prompt improved using ${name}!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadPrompts();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to improve prompt'); }
    finally { setImprovingId(null); }
  };

  const handleNewPrompt = () => { setNewPromptInitialData(null); setShowNewForm(true); };
  const handleFormSuccess = () => { setShowNewForm(false); setNewPromptInitialData(null); smartInputRef.current?.clear(); loadPrompts(); loadStats(); };
  const handleFormCancel = () => { setShowNewForm(false); };
  const handleRunWorker = async () => {
    try {
      setRunningWorker(true); setError(null);
      await apiClient.runAgentWorker(5);
      setSuccessMessage('Agent analysis completed!');
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadPrompts(); await loadStats();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to run agent'); }
    finally { setRunningWorker(false); }
  };

  const isSearchMode = searchQuery.trim().length > 0;
  const basePrompts = isSearchMode ? searchResults.map(r => r.prompt) : prompts;
  const displayPrompts = showFavoritesOnly ? basePrompts.filter(p => p.is_favorite) : basePrompts;
  const totalPages = Math.ceil(displayPrompts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPrompts = displayPrompts.slice(startIndex, endIndex);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, viewMode]);

  const STAT_CONFIG = {
    blue:   { icon: 'text-primary',    bg: 'bg-primary/10',     border: 'border-primary/30' },
    purple: { icon: 'text-purple-400', bg: 'bg-purple-500/10',  border: 'border-purple-500/30' },
    green:  { icon: 'text-green-400',  bg: 'bg-green-500/10',   border: 'border-green-500/30' },
    orange: { icon: 'text-orange-400', bg: 'bg-orange-500/10',  border: 'border-orange-500/30' },
  };

  const StatCard = ({ icon: Icon, label, value, variant }: { icon: React.ElementType; label: string; value: number; variant: 'blue' | 'purple' | 'green' | 'orange' }) => {
    const cfg = STAT_CONFIG[variant];
    return (
      <Card className={`${cfg.border} shadow-[0_2px_8px_rgba(0,0,0,0.25)]`}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${cfg.bg}`}>
            <Icon className={`h-5 w-5 ${cfg.icon}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{value}</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const catConfig: Record<string, { color: string; textColor: string }> = {
    delphi: { color: 'bg-primary/10', textColor: 'text-primary' },
    oracle: { color: 'bg-red-500/10', textColor: 'text-red-400' },
    arquitetura: { color: 'bg-purple-500/10', textColor: 'text-purple-400' },
  };

  return (
    <AppShell detectedContext={detectedContext}>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Stats */}
        {!loadingStats && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={FileText} label="Prompts" value={stats.total_prompts ?? 0} variant="blue" />
            <StatCard icon={TrendingUp} label="Analyzed" value={stats.total_analyzed ?? 0} variant="purple" />
            <StatCard icon={Sparkles} label="Improved" value={stats.total_improved ?? 0} variant="green" />
            <StatCard icon={GitBranch} label="Versions" value={stats.total_versions ?? 0} variant="orange" />
          </div>
        )}

        {/* Category stats */}
        {stats && Object.keys(stats.total_by_category).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.total_by_category).map(([cat, count]) => {
              const cfg = catConfig[cat.toLowerCase()] ?? { color: 'bg-secondary', textColor: 'text-muted-foreground' };
              return (
                <Card key={cat} className="shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${cfg.color}`}>
                      <FolderOpen className={`h-3.5 w-3.5 ${cfg.textColor}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground capitalize">{cat}</p>
                      <p className="text-lg font-bold text-foreground">{count}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {stats.uncategorized_count > 0 && (
              <Card className="shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-secondary"><FolderOpen className="h-3.5 w-3.5 text-muted-foreground" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Uncategorized</p>
                    <p className="text-lg font-bold text-foreground">{stats.uncategorized_count}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Prompt Studio */}
        <PromptStudio
          initialIdea={studioIdea}
          initialSpec={studioSpec}
          forceOpen={studioOpen}
        />

        {/* Smart Input */}
        <div>
          <SmartInput onContextDetected={handleContextDetected} placeholder="Type or paste code/description..." inputRef={smartInputRef} />
          {detectedContext && detectedContext.confidence > 0.3 && (
            <div className="mt-2">
              <Button onClick={handleSmartInputNewPrompt} className="w-full"><Plus className="h-4 w-4 mr-1" /> New Prompt (categorized)</Button>
            </div>
          )}
        </div>

        {/* Search + Actions */}
        <Card className="border-l-4 border-l-primary shadow-[0_4px_14px_rgba(0,0,0,0.3),0_0_0_1px_rgba(47,129,247,0.15)]">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Searching...</span>}
            </div>
            {isSearchMode && !searching && (
              <p className="text-xs text-muted-foreground">
                {searchResults.length > 0
                  ? `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
                  : `No results for "${searchQuery}"`}
              </p>
            )}
            <div className="flex gap-2 items-center flex-wrap">
              <Button size="sm" onClick={handleNewPrompt} disabled={showNewForm}><Plus className="h-3.5 w-3.5 mr-1" /> New Prompt</Button>
              <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setSearchResults([]); loadPrompts(); }} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
              <Button variant="secondary" size="sm" onClick={handleRunWorker} disabled={runningWorker}>
                <Bot className="h-3.5 w-3.5 mr-1" /> {runningWorker ? 'Analyzing...' : 'Analyze'}
              </Button>
              <Button
                variant={showFavoritesOnly ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setShowFavoritesOnly(p => !p)}
              >
                <Star className={`h-3.5 w-3.5 mr-1 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                Favoritos
              </Button>
              {!isSearchMode && (
                <div className="ml-auto flex gap-0.5 bg-muted rounded-md p-0.5">
                  {([['grouped', Grid], ['table', Table2], ['grid', LayoutGrid]] as const).map(([mode, Icon]) => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? 'default' : 'ghost'}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setViewMode(mode)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* New Prompt Form */}
        {showNewForm && (
          <Card className="border-primary/30 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            <CardContent className="p-4">
              <NewPromptForm onSuccess={handleFormSuccess} onCancel={handleFormCancel} initialContent={newPromptInitialData?.content} initialCategory={newPromptInitialData?.category} />
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        {successMessage && <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-400">{successMessage}</div>}

        {/* Loading */}
        {loading && <div className="text-center py-12 text-muted-foreground text-sm">Loading prompts...</div>}

        {/* Empty */}
        {!loading && !isSearchMode && prompts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No prompts yet. Create your first prompt!</div>
        )}
        {!loading && isSearchMode && !searching && searchResults.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No results found.</div>
        )}

        {/* Grouped */}
        {!loading && !isSearchMode && viewMode === 'grouped' && groupedPrompts && (
          <div className="space-y-4">
            {groupedPrompts.by_category.filter(c => c.category !== null).map((category) => (
              <CategorySection key={category.category || 'uncategorized'} category={category} allPrompts={prompts} onPromptUpdated={loadPrompts} />
            ))}
            {groupedPrompts.by_category.find(c => c.category === null) && (
              <CategorySection category={groupedPrompts.by_category.find(c => c.category === null)!} allPrompts={prompts} onPromptUpdated={loadPrompts} />
            )}
          </div>
        )}

        {/* Grid */}
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
                  onFavoriteToggled={(updated) => setPrompts(prev => prev.map(p => p.id === updated.id ? { ...p, is_favorite: updated.is_favorite } : p))}
                />
              ))}
            </div>
            {!isSearchMode && totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {startIndex + 1}–{Math.min(endIndex, displayPrompts.length)} of {displayPrompts.length}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let num;
                    if (totalPages <= 5) num = i + 1;
                    else if (currentPage <= 3) num = i + 1;
                    else if (currentPage >= totalPages - 2) num = totalPages - 4 + i;
                    else num = currentPage - 2 + i;
                    return (
                      <Button key={num} variant={currentPage === num ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(num)}>
                        {num}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Table */}
        {!loading && displayPrompts.length > 0 && viewMode === 'table' && !isSearchMode && (
          <>
            <PromptTable prompts={paginatedPrompts} onEdit={setEditingPrompt} onDelete={setDeletingPrompt} onImprove={handleImprove} improvingIds={improvingId ? new Set([improvingId]) : new Set()} />
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">{startIndex + 1}–{Math.min(endIndex, displayPrompts.length)} of {displayPrompts.length}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modals */}
        {editingPrompt && <EditPromptModal prompt={editingPrompt} isOpen={true} onClose={() => setEditingPrompt(null)} onSuccess={() => { setEditingPrompt(null); loadPrompts(); }} />}
        {deletingPrompt && <DeletePromptModal prompt={deletingPrompt} isOpen={true} onClose={() => setDeletingPrompt(null)} onSuccess={() => { setDeletingPrompt(null); loadPrompts(); }} />}
      </div>
    </AppShell>
  );
}
