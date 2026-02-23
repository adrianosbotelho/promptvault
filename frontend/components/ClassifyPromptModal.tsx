'use client';

import { useState } from 'react';
import { PromptListItem, PromptCategory, PromptTag } from '@/lib/api';
import { X } from 'lucide-react';

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

export default function ClassifyPromptModal({
  prompt,
  isOpen,
  onClose,
  onSuccess,
}: ClassifyPromptModalProps) {
  const [category, setCategory] = useState<PromptCategory | null>(
    (prompt.category as PromptCategory) || null
  );
  const [tags, setTags] = useState<PromptTag[]>(
    (prompt.tags as PromptTag[]) || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTagToggle = (tag: PromptTag) => {
    setTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { apiClient } = await import('@/lib/api');
      await apiClient.updatePromptCategory(prompt.id, {
        category: category || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f1f23] rounded border border-[#2c2c34] shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">
              Classify Prompt
            </h2>
            <button
              onClick={onClose}
              className="text-[#8c8c8c] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-xs text-white mb-1">
              <strong>{prompt.name}</strong>
            </p>
            {prompt.description && (
              <p className="text-xs text-[#8c8c8c]">{prompt.description}</p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 text-red-400 rounded text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Category Selection */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#8c8c8c] mb-2">
                Category
              </label>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat.value}
                    className="flex items-center p-3 border border-[#2c2c34] rounded cursor-pointer hover:bg-[#2c2c34] transition-colors"
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={category === cat.value}
                      onChange={() => setCategory(cat.value)}
                      className="mr-3 accent-[#3274d9]"
                    />
                    <span className="text-xs text-white">{cat.label}</span>
                  </label>
                ))}
                <label className="flex items-center p-3 border border-[#2c2c34] rounded cursor-pointer hover:bg-[#2c2c34] transition-colors">
                  <input
                    type="radio"
                    name="category"
                    value=""
                    checked={category === null}
                    onChange={() => setCategory(null)}
                    className="mr-3 accent-[#3274d9]"
                  />
                  <span className="text-xs text-[#8c8c8c]">No Category</span>
                </label>
              </div>
            </div>

            {/* Tags Selection */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#8c8c8c] mb-2">
                Tags (multiple selection)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TAGS.map((tag) => (
                  <label
                    key={tag.value}
                    className="flex items-center p-2 border border-[#2c2c34] rounded cursor-pointer hover:bg-[#2c2c34] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={tags.includes(tag.value)}
                      onChange={() => handleTagToggle(tag.value)}
                      className="mr-2 accent-[#3274d9]"
                    />
                    <span className="text-xs text-white">{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 bg-[#2c2c34] text-[#d8d9da] rounded text-sm font-medium hover:bg-[#3a3a44] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-3 py-2 bg-[#3274d9] text-white rounded text-sm font-medium hover:bg-[#1f60c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
