'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { apiClient, AnalyticsData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Star, GitBranch, Lightbulb, TrendingUp, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  delphi:       'bg-blue-500',
  oracle:       'bg-orange-500',
  arquitetura:  'bg-purple-500',
  python:       'bg-green-500',
  sql:          'bg-cyan-500',
  api:          'bg-pink-500',
  'Sem categoria': 'bg-muted-foreground',
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? 'bg-primary';
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn('p-2 rounded-md', color ?? 'bg-primary/10')}>
          <Icon className={cn('h-4 w-4', color ? 'text-white' : 'text-primary')} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function HorizontalBar({ label, value, max, color, count }: {
  label: string;
  value: number;
  max: number;
  color: string;
  count: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 truncate shrink-0 text-right capitalize">{label}</span>
      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground w-6 text-right shrink-0">{count}</span>
    </div>
  );
}

function QualityTimeline({ data }: { data: AnalyticsData['quality_over_time'] }) {
  if (!data.length) {
    return <p className="text-xs text-muted-foreground text-center py-6">Dados insuficientes para o gráfico.</p>;
  }

  const maxScore = 100;
  const chartH = 120;
  const chartW = 600;
  const padL = 40;
  const padR = 16;
  const padT = 8;
  const padB = 24;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const points = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * innerW,
    y: padT + innerH - (d.avg_score / maxScore) * innerH,
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${padL} ${(padT + innerH).toFixed(1)} Z`;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[300px]" style={{ height: chartH }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = padT + innerH - (v / maxScore) * innerH;
          return (
            <g key={v}>
              <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />
              <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={9} fill="currentColor" fillOpacity={0.4}>{v}</text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={areaD} fill="currentColor" fillOpacity={0.08} />
        {/* Line */}
        <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinejoin="round" />
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="hsl(var(--primary))" />
            <title>{p.date}: {p.avg_score} (n={p.prompt_count})</title>
          </g>
        ))}
        {/* X labels — show only a few */}
        {points.filter((_, i) => i === 0 || i === points.length - 1 || (points.length > 4 && i % Math.ceil(points.length / 4) === 0)).map((p, i) => (
          <text key={i} x={p.x} y={chartH - 4} textAnchor="middle" fontSize={8} fill="currentColor" fillOpacity={0.4}>
            {p.date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getAnalytics()
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Falha ao carregar analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto py-16 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando analytics...
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto">
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error ?? 'Dados indisponíveis.'}
          </div>
        </div>
      </AppShell>
    );
  }

  const maxCat = Math.max(...data.category_distribution.map(c => c.count), 1);
  const maxTag = Math.max(...data.tag_distribution.map(t => t.count), 1);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão geral do seu vault de prompts — distribuição, qualidade e evolução ao longo do tempo.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={BarChart3} label="Total de Prompts" value={data.total_prompts} />
          <StatCard icon={Star} label="Favoritos" value={data.total_favorites} sub={`${data.total_prompts > 0 ? Math.round(data.total_favorites / data.total_prompts * 100) : 0}% do total`} />
          <StatCard icon={GitBranch} label="Versões" value={data.total_versions} sub={`~${data.total_prompts > 0 ? (data.total_versions / data.total_prompts).toFixed(1) : 0} por prompt`} />
          <StatCard icon={Lightbulb} label="Insights" value={data.total_insights} />
          <StatCard icon={TrendingUp} label="Quality Score" value={data.avg_quality_score} sub="média geral" />
          <StatCard icon={GitBranch} label="Melhorados" value={`${data.prompts_improved_pct}%`} sub="com mais de 1 versão" />
        </div>

        {/* Quality score gauge */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">Quality Score Médio</p>
              <span className="text-2xl font-bold text-foreground">{data.avg_quality_score}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  data.avg_quality_score >= 70 ? 'bg-green-500' :
                  data.avg_quality_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${data.avg_quality_score}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">0</span>
              <span className="text-[10px] text-muted-foreground">Baixo &lt;40 · Médio 40-70 · Alto &gt;70</span>
              <span className="text-[10px] text-muted-foreground">100</span>
            </div>
          </CardContent>
        </Card>

        {/* Quality over time */}
        {data.quality_over_time.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Evolução do Quality Score (por semana de criação)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <QualityTimeline data={data.quality_over_time} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category distribution */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Distribuição por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {data.category_distribution.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado disponível.</p>
              ) : (
                data.category_distribution.map(c => (
                  <HorizontalBar
                    key={c.category}
                    label={c.category}
                    value={c.count}
                    max={maxCat}
                    color={getCategoryColor(c.category)}
                    count={c.count}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Tag distribution */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" /> Tags Mais Usadas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {data.tag_distribution.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tag encontrada.</p>
              ) : (
                <div className="space-y-2">
                  {data.tag_distribution.map(t => (
                    <HorizontalBar
                      key={t.tag}
                      label={t.tag}
                      value={t.count}
                      max={maxTag}
                      color="bg-primary"
                      count={t.count}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category pills summary */}
        {data.category_distribution.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Resumo por categoria</p>
              <div className="flex flex-wrap gap-2">
                {data.category_distribution.map(c => (
                  <div key={c.category} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5">
                    <div className={cn('h-2 w-2 rounded-full', getCategoryColor(c.category))} />
                    <span className="text-xs font-medium capitalize">{c.category}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{c.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
