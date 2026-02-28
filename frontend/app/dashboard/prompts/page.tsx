'use client';

import { useState, useEffect } from 'react';
import { apiClient, PromptListItem } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import CategoryBadge from '@/components/CategoryBadge';
import Link from 'next/link';
import { FileText, Search } from 'lucide-react';

export default function PromptViewPage() {
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadPrompts(); }, []);

  const loadPrompts = async () => {
    try { setLoading(true); setError(null); setPrompts(await apiClient.getPrompts()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load prompts'); }
    finally { setLoading(false); }
  };

  const filtered = prompts.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.tags?.some(t => t.toLowerCase().includes(q));
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-5">
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search prompts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading prompts...</div>
        ) : error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">{searchQuery ? 'No prompts found.' : 'No prompts yet.'}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <Card key={p.id} className="hover:border-primary/50 transition-colors">
                <Link href={`/dashboard/prompts/${p.id}`} className="block">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="font-semibold text-foreground text-sm flex-1 truncate">{p.name}</h3>
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>v{p.latest_version}</span>
                      {p.category && <CategoryBadge category={p.category} size="sm" />}
                    </div>
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
