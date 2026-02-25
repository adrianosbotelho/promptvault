'use client';

import { PromptListItem } from '@/lib/api';
import CategoryBadge from './CategoryBadge';
import Link from 'next/link';
import { FileText, Edit2, Trash2, Sparkles, Clock, Tag, CheckCircle2 } from 'lucide-react';

interface PromptCardProps {
  prompt: PromptListItem;
  onEdit?: (prompt: PromptListItem) => void;
  onDelete?: (prompt: PromptListItem) => void;
  onImprove?: (id: number) => void;
  improving?: boolean;
  similarity?: number;
}

// Tag color mapping
const getTagColor = (tag: string): { bg: string; text: string; border: string } => {
  const tagLower = tag.toLowerCase();
  
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'implementation': {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/50'
    },
    'debug': {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/50'
    },
    'architecture': {
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/50'
    },
    'performance': {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      border: 'border-green-500/50'
    },
    'analysis': {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-400',
      border: 'border-yellow-500/50'
    },
    'improvement': {
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-400',
      border: 'border-cyan-500/50'
    }
  };
  
  return colorMap[tagLower] || {
    bg: 'bg-[#2c2c34]',
    text: 'text-[#d8d9da]',
    border: 'border-[#3a3a44]'
  };
};

export default function PromptCard({
  prompt,
  onEdit,
  onDelete,
  onImprove,
  improving = false,
  similarity,
}: PromptCardProps) {
  // Check if prompt was improved
  const isImproved = !!prompt.provider;
  
  return (
    <div className={`bg-[#1f1f23] rounded border p-4 transition-all group relative ${
      isImproved 
        ? 'border-[#3274d9]/60 shadow-[0_0_0_1px_rgba(50,116,217,0.1)] hover:border-[#3274d9] hover:shadow-[0_0_0_2px_rgba(50,116,217,0.2)]' 
        : 'border-[#2c2c34] hover:border-[#3274d9]'
    }`}>
      {/* Improved badge */}
      {isImproved && (
        <div className="absolute bottom-2 right-2">
          <div className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
            <Sparkles className="w-3 h-3" />
            <span>Improved</span>
          </div>
        </div>
      )}
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
          
          {/* Tags */}
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <Tag className="w-3 h-3 text-[#8c8c8c]" />
              {prompt.tags.map((tag, idx) => {
                const tagColor = getTagColor(tag);
                return (
                  <span
                    key={idx}
                    className={`px-1.5 py-0.5 ${tagColor.bg} ${tagColor.text} rounded text-xs border ${tagColor.border} font-medium`}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-[#8c8c8c] flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              v{prompt.latest_version || 1}
            </span>
            <span>{new Date(prompt.updated_at).toLocaleDateString()}</span>
            {prompt.provider && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#3274d9]/20 text-[#3274d9] rounded">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-xs font-medium">
                  {prompt.provider === 'MockLLMProvider' 
                    ? 'Mock' 
                    : prompt.provider === 'GroqProvider'
                    ? 'Groq'
                    : prompt.provider === 'OpenAIProvider'
                    ? 'OpenAI'
                    : 'Improved'}
                </span>
              </span>
            )}
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
