'use client';

import { useState } from 'react';
import { PromptListItem, PromptCategory, PromptTag } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ClassifyPromptModalProps {
  prompt: PromptListItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: { value: PromptCategory; label: string }[] = [
  { value: 'delphi', label: 'Delphi Development' },
  { value: 'oracle', label: 'Oracle Development' },
  { value: 'arquitetura', label: 'Architecture' },
];

const TAGS: { value: PromptTag; label: string }[] = [
  { value: 'implementation', label: 'Implementation' },
  { value: 'debug', label: 'Debug' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'performance', label: 'Performance' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'improvement', label: 'Improvement' },
];

export default function ClassifyPromptModal({ prompt, isOpen, onClose, onSuccess }: ClassifyPromptModalProps) {
  const [category, setCategory] = useState<PromptCategory | null>((prompt.category as PromptCategory) || null);
  const [tags, setTags] = useState<PromptTag[]>((prompt.tags as PromptTag[]) || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTagToggle = (tag: PromptTag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const { apiClient } = await import('@/lib/api');
      await apiClient.updatePromptCategory(prompt.id, { category: category || undefined, tags: tags.length > 0 ? tags : undefined });
      onSuccess(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update category'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Classify Prompt</DialogTitle>
          <DialogDescription>
            <strong className="text-foreground">{prompt.name}</strong>
            {prompt.description && <span className="block mt-1">{prompt.description}</span>}
          </DialogDescription>
        </DialogHeader>

        {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <div className="grid gap-1.5">
              {CATEGORIES.map((cat) => (
                <label key={cat.value} className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-accent text-sm">
                  <input type="radio" name="category" checked={category === cat.value} onChange={() => setCategory(cat.value)} className="accent-primary" />
                  {cat.label}
                </label>
              ))}
              <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-accent text-sm text-muted-foreground">
                <input type="radio" name="category" checked={category === null} onChange={() => setCategory(null)} className="accent-primary" />
                No Category
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tags</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TAGS.map((tag) => (
                <label key={tag.value} className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-accent text-sm">
                  <input type="checkbox" checked={tags.includes(tag.value)} onChange={() => handleTagToggle(tag.value)} className="accent-primary" />
                  {tag.label}
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
