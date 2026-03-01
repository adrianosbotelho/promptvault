'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiClient, InsightListItem } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bot, Play, Settings, Loader2, CheckCircle2, AlertCircle,
  Lightbulb, ExternalLink, Layers, AlertTriangle, Sparkles, Clock,
} from 'lucide-react';
import { setAgentRunning } from '@/lib/agentStatus';
import Link from 'next/link';

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export default function AgentPage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ analyzed_count: number; error_count: number; skipped_count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recent insights
  const [recentInsights, setRecentInsights] = useState<InsightListItem[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [lastRunDate, setLastRunDate] = useState<string | null>(null);

  useEffect(() => { loadRecentInsights(); }, []);

  const loadRecentInsights = async () => {
    try {
      setLoadingInsights(true);
      const items = await apiClient.getInsights({ limit: 5 });
      setRecentInsights(items);
      if (items.length > 0) setLastRunDate(items[0].created_at);
    } catch { /* silent */ }
    finally { setLoadingInsights(false); }
  };

  const handleRunAgent = async () => {
    try {
      setRunning(true); setError(null); setRunResult(null);
      setAgentRunning(true);
      const res = await apiClient.runAgentWorker();
      setRunResult({
        analyzed_count: res.results?.analyzed_count ?? 0,
        error_count: res.results?.error_count ?? 0,
        skipped_count: res.results?.skipped_count ?? 0,
      });
      await loadRecentInsights();
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao executar o agente'); }
    finally { setRunning(false); setAgentRunning(false); }
  };

  const totalIdeas = recentInsights.reduce((s, i) => s + (i.improvement_count ?? 0), 0);
  const totalPatterns = recentInsights.reduce((s, i) => s + (i.pattern_count ?? 0), 0);
  const totalWarnings = recentInsights.reduce((s, i) => s + (i.warning_count ?? 0), 0);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header card */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-secondary rounded-md shrink-0"><Bot className="h-6 w-6 text-primary" /></div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground mb-1">AI Agent</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Analisa seus prompts, sugere melhorias, identifica padrões reutilizáveis e gera avisos sobre possíveis problemas.
                </p>
                {lastRunDate && (
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Última análise: {formatDate(lastRunDate)}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handleRunAgent} disabled={running}>
                    {running
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Executando...</>
                      : <><Play className="h-4 w-4 mr-1" /> Executar Agente</>}
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link href="/dashboard/admin/worker"><Settings className="h-4 w-4 mr-1" /> Configurar</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Run result */}
        {runResult && (
          <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <h3 className="font-semibold text-green-400 text-sm">Execução concluída</h3>
            </div>
            <div className="flex gap-4 text-xs text-foreground">
              <span><strong>{runResult.analyzed_count}</strong> analisados</span>
              <span><strong>{runResult.skipped_count}</strong> ignorados</span>
              {runResult.error_count > 0 && <span className="text-red-400"><strong>{runResult.error_count}</strong> erros</span>}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Stats summary */}
        {recentInsights.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Sparkles className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{totalIdeas}</p>
                <p className="text-xs text-muted-foreground">Ideias de melhoria</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Layers className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{totalPatterns}</p>
                <p className="text-xs text-muted-foreground">Padrões detectados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{totalWarnings}</p>
                <p className="text-xs text-muted-foreground">Avisos</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent insights */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" /> Insights Recentes
              </h3>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push('/dashboard/insights')}>
                Ver todos <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
            {loadingInsights ? (
              <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
            ) : recentInsights.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">Nenhum insight gerado ainda.</p>
                <p className="text-xs text-muted-foreground">Execute o agente para analisar seus prompts.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentInsights.map(insight => {
                  const ideas = insight.improvement_count ?? 0;
                  const patterns = insight.pattern_count ?? 0;
                  const warnings = insight.warning_count ?? 0;
                  return (
                    <div key={insight.id} className="flex items-center justify-between gap-3 border rounded-md px-3 py-2.5 hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xs text-muted-foreground shrink-0">{formatDate(insight.created_at)}</span>
                        {ideas > 0 && <Badge variant="blue" className="text-[10px]">{ideas} ideia{ideas !== 1 ? 's' : ''}</Badge>}
                        {patterns > 0 && <Badge variant="secondary" className="text-[10px]">{patterns} padrão{patterns !== 1 ? 'ões' : ''}</Badge>}
                        {warnings > 0 && <Badge variant="yellow" className="text-[10px]">{warnings} aviso{warnings !== 1 ? 's' : ''}</Badge>}
                        {!insight.is_read && <Badge variant="red" className="text-[10px]">Novo</Badge>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs shrink-0 text-primary hover:text-primary/80"
                        onClick={() => router.push(`/dashboard/prompts/${insight.prompt_id}`)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Ver prompt
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3 text-sm">Como funciona</h3>
            <ol className="space-y-2 text-xs text-muted-foreground list-none">
              {[
                'Analisa seus prompts mais recentes usando IA',
                'Gera sugestões de melhoria com prioridade',
                'Identifica padrões reutilizáveis entre prompts',
                'Fornece avisos sobre possíveis problemas',
                'Armazena os resultados como Insights para revisão',
                'O Architect Mentor usa os insights para fornecer dicas contextuais',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
