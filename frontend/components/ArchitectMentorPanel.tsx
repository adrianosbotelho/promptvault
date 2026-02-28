'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient, MentorSummaryResponse, MentorSummaryItem } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Eye, AlertTriangle, Layers, RefreshCw, ExternalLink } from 'lucide-react';

function formatDate(createdAt: string | undefined): string {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

function ItemList({ items, emptyLabel, icon: Icon, iconColor }: { items: MentorSummaryItem[]; emptyLabel: string; icon: React.ElementType; iconColor: string }) {
  if (!items.length) return <p className="text-xs text-muted-foreground italic py-4">{emptyLabel}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-foreground">
          <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
          <span className="flex-1 min-w-0">
            <span>{item.text}</span>
            {(item.prompt_id != null || item.created_at) && (
              <span className="text-muted-foreground text-xs ml-1 block mt-1">
                {item.prompt_id != null && (
                  <Link href={`/dashboard/prompts/${item.prompt_id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" />
                    {item.prompt_name ? `Prompt: ${item.prompt_name}` : `Prompt #${item.prompt_id}`}
                  </Link>
                )}
                {item.created_at && (
                  <span className={item.prompt_id != null ? ' ml-1' : ''}>
                    {item.prompt_id != null ? ' -- ' : ''}{formatDate(item.created_at)}
                  </span>
                )}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ArchitectMentorPanel() {
  const [summary, setSummary] = useState<MentorSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null); setLoading(true);
      setSummary(await apiClient.getMentorSummary());
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load mentor summary.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isEmpty = summary && !summary.recent_observations.length && !summary.architectural_alerts.length && !summary.detected_patterns.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4 text-amber-400" /> Architect Mentor
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && !summary && <p className="text-sm text-muted-foreground">Loading...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && summary && (
          <Tabs defaultValue="observations">
            <TabsList className="w-full">
              <TabsTrigger value="observations" className="flex-1 gap-1.5 text-xs">
                <Eye className="h-3 w-3" /> Observations
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex-1 gap-1.5 text-xs">
                <AlertTriangle className="h-3 w-3" /> Alerts
              </TabsTrigger>
              <TabsTrigger value="patterns" className="flex-1 gap-1.5 text-xs">
                <Layers className="h-3 w-3" /> Patterns
              </TabsTrigger>
            </TabsList>
            <TabsContent value="observations">
              <ItemList items={summary.recent_observations} emptyLabel="No observations yet. Run prompt analysis to generate." icon={Eye} iconColor="text-primary" />
            </TabsContent>
            <TabsContent value="alerts">
              <ItemList items={summary.architectural_alerts} emptyLabel="No alerts at the moment." icon={AlertTriangle} iconColor="text-amber-400" />
            </TabsContent>
            <TabsContent value="patterns">
              <ItemList items={summary.detected_patterns} emptyLabel="No patterns detected. Run prompt analysis." icon={Layers} iconColor="text-purple-400" />
            </TabsContent>
          </Tabs>
        )}
        {isEmpty && (
          <p className="text-xs text-muted-foreground pt-3 border-t mt-3">
            Use &quot;Analyze Prompts&quot; to generate observations, alerts and patterns from your prompts.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
