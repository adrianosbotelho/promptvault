'use client';

import { useState } from 'react';
import { PromptListItem, GroupedPromptsByCategory } from '@/lib/api';
import CollapsibleSection from './CollapsibleSection';
import CategoryBadge from './CategoryBadge';
import ClassifyPromptModal from './ClassifyPromptModal';
import EditPromptModal from './EditPromptModal';
import DeletePromptModal from './DeletePromptModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Edit2, Trash2, Tag } from 'lucide-react';

const TAG_VARIANT_MAP: Record<string, 'blue' | 'red' | 'purple' | 'green' | 'yellow' | 'cyan' | 'secondary'> = {
  implementation: 'blue',
  debug: 'red',
  architecture: 'purple',
  performance: 'green',
  analysis: 'yellow',
  improvement: 'cyan',
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

  const promptsByTag: Record<string, PromptListItem[]> = {};
  category.prompts.forEach(prompt => {
    if (prompt.tags?.length) {
      prompt.tags.forEach(tag => {
        if (!promptsByTag[tag]) promptsByTag[tag] = [];
        if (!promptsByTag[tag].find(p => p.id === prompt.id)) promptsByTag[tag].push(prompt);
      });
    } else {
      if (!promptsByTag['Untagged']) promptsByTag['Untagged'] = [];
      promptsByTag['Untagged'].push(prompt);
    }
  });

  const categoryName = category.category || 'Uncategorized';
  const displayName = categoryName === 'delphi' ? 'Delphi Development' : categoryName === 'oracle' ? 'Oracle Development' : categoryName === 'arquitetura' ? 'Architecture' : categoryName;

  return (
    <CollapsibleSection
      title={<div className="flex items-center gap-2"><CategoryBadge category={category.category ?? 'Uncategorized'} size="sm" /><span>{displayName}</span></div>}
      defaultOpen
    >
      <div className="mt-2 space-y-2">
        {Object.entries(promptsByTag).sort().map(([tag, prompts]) => {
          const variant = tag === 'Untagged' ? 'secondary' : (TAG_VARIANT_MAP[tag.toLowerCase()] ?? 'secondary');
          return (
            <div key={tag} className="ml-4 border-l-2 border-border pl-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={variant} className="text-xs">&#9656; {tag}</Badge>
                <span className="text-xs text-muted-foreground">({prompts.length})</span>
              </div>
              <div className="ml-4 space-y-1">
                {prompts.map(prompt => (
                  <div key={prompt.id} className="flex items-center gap-2 group">
                    <Link href={`/dashboard/prompts/${prompt.id}`} className="flex-1 flex items-center gap-2 text-xs text-foreground hover:text-primary hover:underline py-1">
                      <span>{prompt.name}</span>
                      {prompt.category && <CategoryBadge category={prompt.category} size="sm" />}
                    </Link>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-all">
                      {!prompt.category && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setClassifyPrompt(prompt); }} title="Classify">
                          <Tag className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingPrompt(prompt); }} title="Edit">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingPrompt(prompt); }} title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!Object.keys(promptsByTag).length && <p className="text-xs text-muted-foreground ml-4">No prompts in this category</p>}
      </div>
      {classifyPrompt && <ClassifyPromptModal prompt={classifyPrompt} isOpen onClose={() => setClassifyPrompt(null)} onSuccess={() => { setClassifyPrompt(null); onPromptUpdated?.(); }} />}
      {editingPrompt && <EditPromptModal prompt={editingPrompt} isOpen onClose={() => setEditingPrompt(null)} onSuccess={() => { setEditingPrompt(null); onPromptUpdated?.(); }} />}
      {deletingPrompt && <DeletePromptModal prompt={deletingPrompt} isOpen onClose={() => setDeletingPrompt(null)} onSuccess={() => { setDeletingPrompt(null); onPromptUpdated?.(); }} />}
    </CollapsibleSection>
  );
}
