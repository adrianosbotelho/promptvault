'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, PromptListItem, SemanticSearchResult } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CategoryBadge from '@/components/CategoryBadge';
import Link from 'next/link';
import { FileText, Search, Sparkles, Download, Star, GitFork, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type SearchMode = 'text' | 'semantic';

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 2) return 'agora';
  if (mins < 60) return `${mins}min`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return 'ontem';
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function PromptViewPage() {
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('text');
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[] | null>(null);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadPrompts(); }, []);

  // Close export dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadPrompts = async () => {
    try { setLoading(true); setError(null); setPrompts(await apiClient.getPrompts()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load prompts'); }
    finally { setLoading(false); }
  };

  const runSemanticSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSemanticResults(null); return; }
    try {
      setSemanticLoading(true);
      const results = await apiClient.searchPrompts(q, 20);
      setSemanticResults(results);
    } catch {
      setSemanticResults([]);
    } finally {
      setSemanticLoading(false);
    }
  }, []);

  // Debounced semantic search
  useEffect(() => {
    if (searchMode !== 'semantic') return;
    const timer = setTimeout(() => runSemanticSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMode, runSemanticSearch]);

  // When switching modes, clear semantic results
  const handleModeToggle = (mode: SearchMode) => {
    setSearchMode(mode);
    if (mode === 'text') setSemanticResults(null);
    else if (searchQuery.trim()) runSemanticSearch(searchQuery);
  };

  const handleExport = (format: 'json' | 'zip', favoritesOnly: boolean) => {
    const url = apiClient.exportPromptsUrl(format, favoritesOnly);
    const a = document.createElement('a');
    a.href = url;
    a.click();
    setExportOpen(false);
  };

  // Filtered list for text mode
  const textFiltered = prompts.filter(p => {
    if (showFavoritesOnly && !p.is_favorite) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q))
    );
  });

  // Semantic results filtered by favorites
  const semanticFiltered = (semanticResults ?? []).filter(r =>
    !showFavoritesOnly || r.prompt.is_favorite
  );

  const displayItems: { id: number; name: string; description?: string | null; category?: string | null; tags?: string[] | null; latest_version?: number | null; is_favorite?: boolean; quality_score?: number; updated_at: string; similarity?: number }[] =
    searchMode === 'semantic' && semanticResults !== null
      ? semanticFiltered.map(r => ({ ...r.prompt, similarity: r.similarity }))
      : textFiltered;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Toolbar */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search input */}
              <div className="relative flex-1 min-w-48">
                {semanticLoading
                  ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                  : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                }
                <Input
                  placeholder={searchMode === 'semantic' ? 'Busca semântica por significado...' : 'Buscar prompts...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Search mode toggle */}
              <div className="flex items-center rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => handleModeToggle('text')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1',
                    searchMode === 'text' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Search className="h-3 w-3" /> Texto
                </button>
                <button
                  onClick={() => handleModeToggle('semantic')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1',
                    searchMode === 'semantic' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Sparkles className="h-3 w-3" /> Semântica
                </button>
              </div>

              {/* Favorites toggle */}
              <button
                onClick={() => setShowFavoritesOnly(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                  showFavoritesOnly
                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                    : 'text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                )}
              >
                <Star className={cn('h-3.5 w-3.5', showFavoritesOnly && 'fill-yellow-500')} />
                Favoritos
              </button>

              {/* Export dropdown */}
              <div className="relative" ref={exportRef}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setExportOpen(v => !v)}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar
                </Button>
                {exportOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg min-w-48 py-1">
                    <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Todos os prompts</p>
                    <button onClick={() => handleExport('json', false)} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors">
                      Exportar como JSON
                    </button>
                    <button onClick={() => handleExport('zip', false)} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors">
                      Exportar como ZIP (.md)
                    </button>
                    <div className="border-t border-border my-1" />
                    <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Apenas favoritos</p>
                    <button onClick={() => handleExport('json', true)} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors">
                      Favoritos como JSON
                    </button>
                    <button onClick={() => handleExport('zip', true)} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors">
                      Favoritos como ZIP (.md)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Semantic search hint */}
            {searchMode === 'semantic' && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                Busca por <strong>significado</strong> usando embeddings vetoriais — encontra prompts semanticamente similares mesmo sem palavras-chave exatas.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Results count */}
        {!loading && (
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              {displayItems.length} prompt{displayItems.length !== 1 ? 's' : ''}
              {showFavoritesOnly ? ' favoritos' : ''}
              {searchQuery && ` para "${searchQuery}"`}
            </p>
            {searchMode === 'semantic' && semanticResults !== null && (
              <Badge variant="secondary" className="text-[10px]">
                <Sparkles className="h-2.5 w-2.5 mr-1" /> Busca semântica ativa
              </Badge>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando prompts...
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {searchQuery ? 'Nenhum prompt encontrado.' : showFavoritesOnly ? 'Nenhum favorito ainda.' : 'Nenhum prompt ainda.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayItems.map((p) => (
              <Card key={p.id} className="hover:border-primary/50 transition-colors group">
                <Link href={`/dashboard/prompts/${p.id}`} className="block">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="font-semibold text-foreground text-sm flex-1 truncate">{p.name}</h3>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        {p.is_favorite && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>v{p.latest_version}</span>
                      {p.category && <CategoryBadge category={p.category} size="sm" />}
                      {p.tags?.slice(0, 2).map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                      ))}
                      <span className="ml-auto">{formatRelativeDate(p.updated_at)}</span>
                    </div>
                    {'similarity' in p && typeof p.similarity === 'number' && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.round(p.similarity * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{Math.round(p.similarity * 100)}%</span>
                      </div>
                    )}
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
