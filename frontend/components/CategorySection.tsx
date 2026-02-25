'use client';

import { useState } from 'react';
import { PromptListItem, GroupedPromptsByCategory } from '@/lib/api';
import CollapsibleSection from './CollapsibleSection';
import CategoryBadge from './CategoryBadge';
import ClassifyPromptModal from './ClassifyPromptModal';
import EditPromptModal from './EditPromptModal';
import DeletePromptModal from './DeletePromptModal';
import Link from 'next/link';
import { Edit2, Trash2, Tag } from 'lucide-react';

// Tag color mapping (same as PromptCard)
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
    text: 'text-[#8c8c8c]',
    border: 'border-[#3a3a44]'
  };
};

interface CategorySectionProps {
  category: GroupedPromptsByCategory;
  allPrompts: PromptListItem[];
  onPromptUpdated?: () => void;
}

export default function CategorySection({ category, allPrompts, onPromptUpdated }: CategorySectionProps) {
  const [classifyPrompt, setClassifyPrompt] = useState<PromptListItem | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<PromptListItem | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<PromptListItem | null>(null);
  // Group prompts by tag for this category
  const promptsByTag: Record<string, PromptListItem[]> = {};
  
  category.prompts.forEach(prompt => {
    if (prompt.tags && prompt.tags.length > 0) {
      prompt.tags.forEach(tag => {
        if (!promptsByTag[tag]) {
          promptsByTag[tag] = [];
        }
        if (!promptsByTag[tag].find(p => p.id === prompt.id)) {
          promptsByTag[tag].push(prompt);
        }
      });
    } else {
      // Prompts without tags go to "Untagged"
      if (!promptsByTag['Untagged']) {
        promptsByTag['Untagged'] = [];
      }
      promptsByTag['Untagged'].push(prompt);
    }
  });

  const categoryName = category.category || 'Sem Categoria';
  const categoryDisplayName = categoryName === 'delphi' ? 'Delphi Development' :
                              categoryName === 'oracle' ? 'Oracle Development' :
                              categoryName === 'arquitetura' ? 'Architecture' :
                              categoryName === 'Sem Categoria' ? 'Sem Categoria' :
                              categoryName;

  return (
    <CollapsibleSection 
      title={
        <div className="flex items-center gap-2">
          <CategoryBadge category={category.category} size="md" />
          <span>{categoryDisplayName}</span>
        </div>
      } 
      defaultOpen={true}
    >
      <div className="mt-2 space-y-2">
        {Object.entries(promptsByTag).sort().map(([tag, prompts]) => {
          const tagColor = tag === 'Untagged' 
            ? { bg: 'bg-[#2c2c34]', text: 'text-[#8c8c8c]', border: 'border-[#3a3a44]' }
            : getTagColor(tag);
          return (
            <div key={tag} className="ml-4 border-l-2 border-[#2c2c34] pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${tagColor.bg} ${tagColor.text} border ${tagColor.border}`}>
                  ▸ {tag}
                </span>
                <span className="text-xs text-[#8c8c8c]">({prompts.length})</span>
              </div>
            <div className="ml-4 space-y-1">
              {prompts.map(prompt => (
                <div key={prompt.id} className="flex items-center gap-2 group">
                  <Link
                    href={`/dashboard/prompts/${prompt.id}`}
                    className="flex-1 flex items-center gap-2 text-xs text-[#d8d9da] hover:text-[#3274d9] hover:underline py-1"
                  >
                    <span>{prompt.name}</span>
                    {prompt.category && (
                      <CategoryBadge category={prompt.category} size="sm" />
                    )}
                  </Link>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                    {!prompt.category && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setClassifyPrompt(prompt);
                        }}
                        className="p-1.5 bg-[#2c2c34] text-[#d8d9da] rounded hover:bg-[#3a3a44] transition-colors"
                        title="Classify prompt"
                      >
                        <Tag className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPrompt(prompt);
                      }}
                      className="p-1.5 bg-[#2c2c34] text-[#d8d9da] rounded hover:bg-[#3a3a44] transition-colors"
                      title="Edit prompt"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingPrompt(prompt);
                      }}
                      className="p-1.5 bg-[#2c2c34] text-red-400 rounded hover:bg-[#3a3a44] transition-colors"
                      title="Delete prompt"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })}
        {Object.keys(promptsByTag).length === 0 && (
          <p className="text-xs text-[#8c8c8c] ml-4">No prompts in this category</p>
        )}
      </div>
      {classifyPrompt && (
        <ClassifyPromptModal
          prompt={classifyPrompt}
          isOpen={true}
          onClose={() => setClassifyPrompt(null)}
          onSuccess={() => {
            setClassifyPrompt(null);
            if (onPromptUpdated) {
              onPromptUpdated();
            }
          }}
        />
      )}
      {editingPrompt && (
        <EditPromptModal
          prompt={editingPrompt}
          isOpen={true}
          onClose={() => setEditingPrompt(null)}
          onSuccess={() => {
            setEditingPrompt(null);
            if (onPromptUpdated) {
              onPromptUpdated();
            }
          }}
        />
      )}
      {deletingPrompt && (
        <DeletePromptModal
          prompt={deletingPrompt}
          isOpen={true}
          onClose={() => setDeletingPrompt(null)}
          onSuccess={() => {
            setDeletingPrompt(null);
            if (onPromptUpdated) {
              onPromptUpdated();
            }
          }}
        />
      )}
    </CollapsibleSection>
  );
}
