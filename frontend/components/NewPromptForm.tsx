'use client';

import { useState, useEffect } from 'react';
import { apiClient, CreatePromptRequest } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface NewPromptFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialContent?: string;
  initialCategory?: string;
}

const CATEGORIES: { value: string | null; label: string }[] = [
  { value: null, label: 'No Category' },
  { value: 'delphi', label: 'Delphi Development' },
  { value: 'oracle', label: 'Oracle Development' },
  { value: 'arquitetura', label: 'Architecture' },
];

export default function NewPromptForm({ onSuccess, onCancel, initialContent, initialCategory }: NewPromptFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState(initialContent || '');
  const [category, setCategory] = useState<string | null>(initialCategory || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (initialContent) setContent(initialContent); }, [initialContent]);
  useEffect(() => { if (initialCategory) setCategory(initialCategory); }, [initialCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setError('Title and content are required'); return; }
    try {
      setLoading(true); setError(null);
      const promptData: CreatePromptRequest = {
        name: title.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
        category: category || undefined,
      };
      await apiClient.createPrompt(promptData);
      setTitle(''); setDescription(''); setContent('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prompt');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Create New Prompt</h2>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-xs font-medium text-muted-foreground">Title *</label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Enter prompt title" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="description" className="text-xs font-medium text-muted-foreground">Description</label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="category" className="text-xs font-medium text-muted-foreground">Category</label>
          <select
            id="category"
            value={category || ''}
            onChange={(e) => setCategory(e.target.value || null)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value ?? 'null'} value={c.value ?? ''} className="bg-card text-foreground">{c.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="content" className="text-xs font-medium text-muted-foreground">Content *</label>
          <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} required rows={8} placeholder="Enter your prompt content..." className="font-mono" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {loading ? 'Creating...' : 'Create Prompt'}
          </Button>
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>}
        </div>
      </div>
    </form>
  );
}
