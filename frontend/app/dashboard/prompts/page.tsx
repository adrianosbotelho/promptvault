'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, PromptListItem } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import { FileText, Search } from 'lucide-react';

export default function PromptViewPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getPrompts();
      setPrompts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrompts = prompts.filter(prompt => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      prompt.name.toLowerCase().includes(query) ||
      prompt.description?.toLowerCase().includes(query) ||
      prompt.category?.toLowerCase().includes(query) ||
      prompt.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Search Card */}
        <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8c8c8c]" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0b0b0f] border border-[#2c2c34] rounded text-sm text-white placeholder-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-[#3274d9] focus:border-[#3274d9]"
            />
          </div>
        </div>

        {/* Prompts Grid */}
        {loading ? (
          <div className="text-center py-12 text-[#8c8c8c] text-sm">
            Loading prompts...
          </div>
        ) : error ? (
          <div className="bg-[#1f1f23] rounded border border-red-500/50 p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="text-center py-12 text-[#8c8c8c] text-sm">
            {searchQuery ? 'No prompts found matching your search.' : 'No prompts yet. Create your first prompt!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrompts.map((prompt) => (
              <Link
                key={prompt.id}
                href={`/dashboard/prompts/${prompt.id}`}
                className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4 hover:border-[#3274d9] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white flex-1 text-sm">{prompt.name}</h3>
                  <FileText className="w-4 h-4 text-[#8c8c8c] flex-shrink-0 ml-2" />
                </div>
                {prompt.description && (
                  <p className="text-xs text-[#8c8c8c] mb-3 line-clamp-2">{prompt.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-[#8c8c8c]">
                  <span>v{prompt.latest_version}</span>
                  {prompt.category && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{prompt.category}</span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
