'use client';

import { PromptListItem, SemanticSearchResult } from '@/lib/api';
import CategoryBadge from './CategoryBadge';
import Link from 'next/link';
import { Edit2, Trash2, Sparkles, FileText } from 'lucide-react';

interface PromptTableProps {
  prompts: PromptListItem[];
  searchResults?: SemanticSearchResult[];
  onEdit?: (prompt: PromptListItem) => void;
  onDelete?: (prompt: PromptListItem) => void;
  onImprove?: (id: number) => void;
  improvingIds?: Set<number>;
}

export default function PromptTable({
  prompts,
  searchResults,
  onEdit,
  onDelete,
  onImprove,
  improvingIds = new Set(),
}: PromptTableProps) {
  const getSimilarity = (promptId: number) => {
    return searchResults?.find(r => r.prompt.id === promptId)?.similarity;
  };

  return (
    <div className="bg-[#1f1f23] rounded border border-[#2c2c34] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2c2c34]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Version</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Updated</th>
              {searchResults && (
                <th className="px-4 py-3 text-left text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Match</th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2c2c34]">
            {prompts.map((prompt) => {
              const similarity = getSimilarity(prompt.id);
              return (
                <tr key={prompt.id} className="hover:bg-[#2c2c34] transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/prompts/${prompt.id}`}
                      className="flex items-center gap-2 group"
                    >
                      <FileText className="w-4 h-4 text-[#8c8c8c] group-hover:text-[#3274d9] transition-colors" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white group-hover:text-[#3274d9] transition-colors truncate">
                          {prompt.name}
                        </div>
                        {prompt.description && (
                          <div className="text-xs text-[#8c8c8c] truncate max-w-md">
                            {prompt.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {prompt.category ? (
                      <CategoryBadge category={prompt.category} size="sm" />
                    ) : (
                      <span className="text-xs text-[#8c8c8c]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#8c8c8c]">v{prompt.latest_version || 1}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#8c8c8c]">
                      {new Date(prompt.updated_at).toLocaleDateString()}
                    </span>
                  </td>
                  {searchResults && (
                    <td className="px-4 py-3">
                      {similarity !== undefined ? (
                        <span className="px-2 py-0.5 bg-[#3274d9]/20 text-[#3274d9] rounded text-xs">
                          {(similarity * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-xs text-[#8c8c8c]">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(prompt);
                          }}
                          className="p-1.5 bg-[#2c2c34] text-[#d8d9da] rounded hover:bg-[#3a3a44] transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(prompt);
                          }}
                          className="p-1.5 bg-[#2c2c34] text-red-400 rounded hover:bg-[#3a3a44] transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onImprove && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onImprove(prompt.id);
                          }}
                          disabled={improvingIds.has(prompt.id)}
                          className="px-2 py-1.5 bg-[#3274d9] text-white rounded text-xs font-medium hover:bg-[#1f60c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          title="Improve"
                        >
                          <Sparkles className="w-3 h-3" />
                          {improvingIds.has(prompt.id) ? '...' : 'Improve'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
