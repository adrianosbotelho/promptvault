'use client';

import { useState, useEffect } from 'react';
import { PromptListItem, PromptCategory, PromptTag, Prompt, apiClient } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface EditPromptModalProps {
  prompt: PromptListItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: { value: PromptCategory | null; label: string }[] = [
  { value: null, label: 'No Category' },
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

export default function EditPromptModal({ prompt, isOpen, onClose, onSuccess }: EditPromptModalProps) {
  const [name, setName] = useState(prompt.name);
  const [description, setDescription] = useState(prompt.description || '');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PromptCategory | null>((prompt.category as PromptCategory) || null);
  const [tags, setTags] = useState<PromptTag[]>((prompt.tags as PromptTag[]) || []);
  const [loading, setLoading] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && prompt.id) loadFullPrompt();
  }, [isOpen, prompt.id]);

  const loadFullPrompt = async () => {
    try {
      setLoadingPrompt(true); setError(null);
      const fullPrompt: Prompt = await apiClient.getPrompt(prompt.id);
      setName(fullPrompt.name);
      setDescription(fullPrompt.description || '');
      setCategory((fullPrompt.category as PromptCategory) || null);
      setTags((fullPrompt.tags as PromptTag[]) || []);
      if (fullPrompt.versions?.length) {
        const latest = fullPrompt.versions.reduce((l, c) => c.version > l.version ? c : l);
        setContent(latest.content || '');
      } else setContent('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load prompt'); }
    finally { setLoadingPrompt(false); }
  };

  const handleTagToggle = (tag: PromptTag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await apiClient.updatePrompt(prompt.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        content: content.trim() || undefined,
        category: category || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      onSuccess(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update prompt'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Prompt</DialogTitle>
          <DialogDescription>Update the prompt details. Editing content creates a new version.</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Prompt name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Content *</label>
            {loadingPrompt ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border rounded-md">Loading content...</div>
            ) : (
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} required placeholder="Prompt content..." className="font-mono" />
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <button type="button" onClick={() => setCategoryOpen(!categoryOpen)}
              className="w-full flex items-center justify-between p-2.5 border rounded-md text-sm hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Category:</span>
                <span className="text-xs">{category ? CATEGORIES.find(c => c.value === category)?.label : 'None'}</span>
              </div>
              {categoryOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {categoryOpen && (
              <div className="grid gap-1.5 border rounded-md p-2">
                {CATEGORIES.map((cat) => (
                  <label key={cat.value ?? 'none'} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                    <input type="radio" name="category" checked={category === cat.value} onChange={() => setCategory(cat.value)} className="accent-primary" />
                    {cat.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <button type="button" onClick={() => setTagsOpen(!tagsOpen)}
              className="w-full flex items-center justify-between p-2.5 border rounded-md text-sm hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Tags:</span>
                {tags.length > 0 ? tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>) : <span className="text-xs text-muted-foreground">None</span>}
              </div>
              {tagsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {tagsOpen && (
              <div className="grid grid-cols-2 gap-1.5 border rounded-md p-2">
                {TAGS.map((tag) => (
                  <label key={tag.value} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                    <input type="checkbox" checked={tags.includes(tag.value)} onChange={() => handleTagToggle(tag.value)} className="accent-primary" />
                    {tag.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading || loadingPrompt || !name.trim() || !content.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
