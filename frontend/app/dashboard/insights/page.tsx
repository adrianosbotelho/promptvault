'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { apiClient, InsightListItem } from '@/lib/api';
import { Lightbulb, CheckCircle2, Circle } from 'lucide-react';

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getInsights({
        unread_only: filter === 'unread'
      });
      setInsights(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [filter]);

  const markAsRead = async (insightId: number) => {
    try {
      await apiClient.markInsightAsRead(insightId);
      setInsights(prev => prev.map(insight => 
        insight.id === insightId 
          ? { ...insight, read_at: new Date().toISOString(), is_read: true }
          : insight
      ));
    } catch (err) {
      console.error('Failed to mark insight as read:', err);
    }
  };

  const filteredInsights = insights.filter(insight => {
    if (filter === 'unread') return !insight.is_read;
    if (filter === 'read') return insight.is_read;
    return true;
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filter Buttons */}
        <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-[#3274d9] text-white' 
                  : 'bg-[#2c2c34] text-[#d8d9da] hover:bg-[#3a3a44]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === 'unread' 
                  ? 'bg-[#3274d9] text-white' 
                  : 'bg-[#2c2c34] text-[#d8d9da] hover:bg-[#3a3a44]'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === 'read' 
                  ? 'bg-[#3274d9] text-white' 
                  : 'bg-[#2c2c34] text-[#d8d9da] hover:bg-[#3a3a44]'
              }`}
            >
              Read
            </button>
          </div>
        </div>

        {/* Insights List */}
        {loading ? (
          <div className="text-center py-12 text-[#8c8c8c] text-sm">
            Loading insights...
          </div>
        ) : error ? (
          <div className="bg-[#1f1f23] rounded border border-red-500/50 p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="text-center py-12 text-[#8c8c8c] text-sm">
            No insights available.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInsights.map((insight) => {
              // Check if insight has any content
              const hasImprovementIdeas = insight.improvement_ideas && Array.isArray(insight.improvement_ideas) && insight.improvement_ideas.length > 0;
              const hasReusablePatterns = insight.reusable_patterns && Array.isArray(insight.reusable_patterns) && insight.reusable_patterns.length > 0;
              const hasWarnings = insight.warnings && Array.isArray(insight.warnings) && insight.warnings.length > 0;
              const hasContent = hasImprovementIdeas || hasReusablePatterns || hasWarnings;

              // Only render if there's content
              if (!hasContent) {
                return null;
              }

              return (
                <div
                  key={insight.id}
                  className={`bg-[#1f1f23] rounded border p-4 ${
                    insight.is_read 
                      ? 'border-[#2c2c34]' 
                      : 'border-[#3274d9]/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Lightbulb className={`w-4 h-4 ${
                        insight.is_read ? 'text-[#8c8c8c]' : 'text-[#3274d9]'
                      }`} />
                      <span className="text-xs text-[#8c8c8c]">
                        {new Date(insight.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {!insight.is_read && (
                      <button
                        onClick={() => markAsRead(insight.id)}
                        className="text-xs text-[#d8d9da] hover:text-white flex items-center gap-1"
                      >
                        <Circle className="w-3 h-3" />
                        Mark as read
                      </button>
                    )}
                    {insight.is_read && (
                      <div className="flex items-center gap-1 text-xs text-[#8c8c8c]">
                        <CheckCircle2 className="w-3 h-3" />
                        Read
                      </div>
                    )}
                  </div>

                  {hasImprovementIdeas && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-white mb-2 text-sm">💡 Improvement Ideas</h3>
                      <ul className="space-y-1.5">
                        {insight.improvement_ideas
                          .filter(idea => idea && String(idea).trim().length > 0)
                          .map((idea, idx) => (
                            <li key={idx} className="text-xs text-[#d8d9da]">
                              {typeof idea === 'string' ? idea : String(idea)}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {hasReusablePatterns && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-white mb-2 text-sm">🔄 Reusable Patterns</h3>
                      <ul className="space-y-1.5">
                        {insight.reusable_patterns
                          .filter(pattern => pattern && String(pattern).trim().length > 0)
                          .map((pattern, idx) => (
                            <li key={idx} className="text-xs text-[#d8d9da]">
                              {typeof pattern === 'string' ? pattern : String(pattern)}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {hasWarnings && (
                    <div>
                      <h3 className="font-semibold text-white mb-2 text-sm">⚠️ Warnings</h3>
                      <ul className="space-y-1.5">
                        {insight.warnings
                          .filter(warning => warning && String(warning).trim().length > 0)
                          .map((warning, idx) => (
                            <li key={idx} className="text-xs text-[#d8d9da]">
                              {typeof warning === 'string' ? (
                                <span className="text-yellow-400">{warning}</span>
                              ) : (
                                <span className="text-yellow-400">{String(warning)}</span>
                              )}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
