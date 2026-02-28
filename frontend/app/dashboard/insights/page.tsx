'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiClient, InsightListItem, InsightDetail } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Lightbulb, CheckCircle2, Circle, ExternalLink,
  ChevronDown, ChevronUp, AlertTriangle, Layers, Sparkles, Loader2,
} from 'lucide-react';

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays}d atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

function IdeaItem({ idea }: { idea: Record<string, unknown> }) {
  const title = String(idea.title ?? '');
  const description = String(idea.description ?? '');
  const priority = String(idea.priority ?? '');
  const reasoning = String(idea.reasoning ?? '');
  return (
    <div className="border rounded-md p-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {priority && (
          <Badge
            variant={priority === 'high' ? 'red' : priority === 'medium' ? 'yellow' : 'blue'}
            className="text-[10px] shrink-0"
          >
            {priority}
          </Badge>
        )}
      </div>
      {description && <p className="text-xs text-foreground">{description}</p>}
      {reasoning && <p className="text-xs text-muted-foreground italic">{reasoning}</p>}
    </div>
  );
}

function PatternItem({ pattern }: { pattern: Record<string, unknown> }) {
  const name = String(pattern.name ?? '');
  const description = String(pattern.description ?? '');
  const example = String(pattern.example ?? '');
  const useCases = Array.isArray(pattern.use_cases) ? pattern.use_cases as string[] : [];
  return (
    <div className="border rounded-md p-3 space-y-1.5">
      <span className="text-sm font-medium text-foreground">{name}</span>
      {description && <p className="text-xs text-foreground">{description}</p>}
      {example && (
        <pre className="bg-muted rounded p-2 text-xs font-mono whitespace-pre-wrap">{example}</pre>
      )}
      {useCases.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {useCases.map((uc, i) => <Badge key={i} variant="blue" className="text-[10px]">{uc}</Badge>)}
        </div>
      )}
    </div>
  );
}

function WarningItem({ warning }: { warning: Record<string, unknown> }) {
  const message = String(warning.message ?? '');
  const suggestion = String(warning.suggestion ?? '');
  const severity = String(warning.severity ?? 'warning');
  return (
    <div className={`border rounded-md p-3 space-y-1 ${severity === 'error' ? 'border-destructive/50 bg-destructive/5' : severity === 'warning' ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-primary/50 bg-primary/5'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{message}</p>
        <Badge variant={severity === 'error' ? 'red' : severity === 'warning' ? 'yellow' : 'blue'} className="text-[10px] shrink-0">{severity}</Badge>
      </div>
      {suggestion && <p className="text-xs text-muted-foreground">Sugestão: {suggestion}</p>}
    </div>
  );
}

function InsightCard({ insight, onMarkRead }: { insight: InsightListItem; onMarkRead: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<InsightDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const router = useRouter();

  const hasContent = insight.improvement_count > 0 || insight.pattern_count > 0 || insight.warning_count > 0;

  const handleToggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) {
      try {
        setLoadingDetail(true);
        setDetail(await apiClient.getInsight(insight.id));
      } catch { /* silent */ }
      finally { setLoadingDetail(false); }
    }
  };

  const ideas = (detail?.improvement_ideas ?? []) as Record<string, unknown>[];
  const patterns = (detail?.reusable_patterns ?? []) as Record<string, unknown>[];
  const warnings = (detail?.warnings ?? []) as Record<string, unknown>[];

  return (
    <Card className={!insight.is_read ? 'border-primary/50' : ''}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Lightbulb className={`h-4 w-4 shrink-0 ${insight.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
            <span className="text-xs text-muted-foreground">{formatDate(insight.created_at)}</span>
            {insight.improvement_count > 0 && (
              <Badge variant="blue" className="text-[10px] gap-1">
                <Sparkles className="h-2.5 w-2.5" /> {insight.improvement_count} ideia{insight.improvement_count !== 1 ? 's' : ''}
              </Badge>
            )}
            {insight.pattern_count > 0 && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Layers className="h-2.5 w-2.5" /> {insight.pattern_count} padrão{insight.pattern_count !== 1 ? 'ões' : ''}
              </Badge>
            )}
            {insight.warning_count > 0 && (
              <Badge variant="yellow" className="text-[10px] gap-1">
                <AlertTriangle className="h-2.5 w-2.5" /> {insight.warning_count} aviso{insight.warning_count !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {insight.prompt_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-primary px-2"
                onClick={() => router.push(`/dashboard/prompts/${insight.prompt_id}`)}
              >
                <ExternalLink className="h-3 w-3 mr-1" /> Ver prompt
              </Button>
            )}
            {!insight.is_read ? (
              <button onClick={() => onMarkRead(insight.id)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Circle className="h-3 w-3" /> Marcar lido
              </button>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" /> Lido
              </div>
            )}
            {hasContent && (
              <button onClick={handleToggle} className="text-muted-foreground hover:text-foreground">
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Expandable content */}
        {expanded && (
          <div className="border-t pt-3 mt-1">
            {loadingDetail ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando detalhes...
              </div>
            ) : (
              <div className="space-y-4">
                {ideas.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Ideias de Melhoria
                    </h3>
                    <div className="space-y-2">
                      {ideas.map((idea, i) => <IdeaItem key={i} idea={idea} />)}
                    </div>
                  </div>
                )}
                {patterns.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-purple-400" /> Padrões Reutilizáveis
                    </h3>
                    <div className="space-y-2">
                      {patterns.map((p, i) => <PatternItem key={i} pattern={p} />)}
                    </div>
                  </div>
                )}
                {warnings.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" /> Avisos
                    </h3>
                    <div className="space-y-2">
                      {warnings.map((w, i) => <WarningItem key={i} warning={w} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const loadInsights = async () => {
    try {
      setLoading(true); setError(null);
      setInsights(await apiClient.getInsights({ unread_only: filter === 'unread' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar insights');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadInsights(); }, [filter]);

  const markAsRead = async (insightId: number) => {
    try {
      await apiClient.markInsightAsRead(insightId);
      setInsights(prev => prev.map(i => i.id === insightId ? { ...i, read_at: new Date().toISOString(), is_read: true } : i));
    } catch (err) { console.error('Failed to mark insight as read:', err); }
  };

  const filteredInsights = insights.filter(i =>
    filter === 'unread' ? !i.is_read : filter === 'read' ? i.is_read : true
  );

  const unreadCount = insights.filter(i => !i.is_read).length;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-5">
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-1 bg-muted rounded-md p-0.5 w-fit">
              {(['all', 'unread', 'read'] as const).map(f => (
                <Button key={f} variant={filter === f ? 'default' : 'ghost'} size="sm" onClick={() => setFilter(f)}>
                  {f === 'all' ? 'Todos' : f === 'unread' ? 'Não lidos' : 'Lidos'}
                  {f === 'unread' && unreadCount > 0 && (
                    <Badge variant="red" className="ml-1.5 text-[10px] h-4 min-w-4 px-1">{unreadCount}</Badge>
                  )}
                </Button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{filteredInsights.length} insight{filteredInsights.length !== 1 ? 's' : ''}</span>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando insights...</div>
        ) : error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        ) : filteredInsights.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {filter === 'unread' ? 'Nenhum insight não lido.' : filter === 'read' ? 'Nenhum insight lido.' : 'Nenhum insight disponível. Analise seus prompts para gerar insights.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} onMarkRead={markAsRead} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
