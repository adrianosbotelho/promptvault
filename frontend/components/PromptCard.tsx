'use client';

import { PromptListItem } from '@/lib/api';
import CategoryBadge from './CategoryBadge';
import Link from 'next/link';
import { FileText, Edit2, Trash2, Sparkles, Clock } from 'lucide-react';

interface PromptCardProps {
  prompt: PromptListItem;
  onEdit?: (prompt: PromptListItem) => void;
  onDelete?: (prompt: PromptListItem) => void;
  onImprove?: (id: number) => void;
  improving?: boolean;
  similarity?: number;
}

export default function PromptCard({
  prompt,
  onEdit,
  onDelete,
  onImprove,
  improving = false,
  similarity,
}: PromptCardProps) {
  return (
    <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4 hover:border-[#3274d9] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/prompts/${prompt.id}`}
            className="block group-hover:text-[#3274d9] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-[#8c8c8c] flex-shrink-0" />
              <h3 className="font-semibold text-white text-sm truncate">{prompt.name}</h3>
              {prompt.category && (
                <CategoryBadge category={prompt.category} size="sm" />
              )}
              {similarity !== undefined && (
                <span className="px-1.5 py-0.5 bg-[#3274d9]/20 text-[#3274d9] rounded text-xs">
                  {(similarity * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </Link>
          {prompt.description && (
            <p className="text-xs text-[#8c8c8c] line-clamp-2 mb-2">
              {prompt.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-[#8c8c8c]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              v{prompt.latest_version || 1}
            </span>
            <span>{new Date(prompt.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-[#2c2c34] opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(prompt);
            }}
            className="p-1.5 bg-[#2c2c34] text-[#d8d9da] rounded hover:bg-[#3a3a44] transition-colors"
            title="Edit prompt"
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
            title="Delete prompt"
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
            disabled={improving}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#3274d9] text-white rounded text-xs font-medium hover:bg-[#1f60c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {improving ? 'Improving...' : 'Improve'}
          </button>
        )}
      </div>
    </div>
  );
}
