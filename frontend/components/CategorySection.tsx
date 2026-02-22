'use client';

import { useState } from 'react';
import { PromptListItem, GroupedPromptsByCategory } from '@/lib/api';
import CollapsibleSection from './CollapsibleSection';
import CategoryBadge from './CategoryBadge';
import ClassifyPromptModal from './ClassifyPromptModal';
import EditPromptModal from './EditPromptModal';
import DeletePromptModal from './DeletePromptModal';
import Link from 'next/link';

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
        {Object.entries(promptsByTag).sort().map(([tag, prompts]) => (
          <div key={tag} className="ml-4 border-l-2 border-gray-200 pl-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">▸ {tag}</span>
              <span className="text-xs text-gray-500">({prompts.length})</span>
            </div>
            <div className="ml-4 space-y-1">
              {prompts.map(prompt => (
                <div key={prompt.id} className="flex items-center gap-2 group">
                  <Link
                    href={`/dashboard/prompts/${prompt.id}`}
                    className="flex-1 flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 hover:underline py-1"
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
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        title="Classificar prompt"
                      >
                        🏷️
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPrompt(prompt);
                      }}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      title="Editar prompt"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingPrompt(prompt);
                      }}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      title="Excluir prompt"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(promptsByTag).length === 0 && (
          <p className="text-sm text-gray-500 ml-4">Nenhum prompt nesta categoria</p>
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
