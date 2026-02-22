'use client';

import { useState } from 'react';
import { PromptListItem, PromptCategory, PromptTag } from '@/lib/api';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Classificar Prompt
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>{prompt.name}</strong>
            </p>
            {prompt.description && (
              <p className="text-xs text-gray-500">{prompt.description}</p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Category Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat.value}
                    className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={category === cat.value}
                      onChange={() => setCategory(cat.value)}
                      className="mr-3"
                    />
                    <span className="text-sm">{cat.label}</span>
                  </label>
                ))}
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="category"
                    value=""
                    checked={category === null}
                    onChange={() => setCategory(null)}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-500">Sem Categoria</span>
                </label>
              </div>
            </div>

            {/* Tags Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (múltipla seleção)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TAGS.map((tag) => (
                  <label
                    key={tag.value}
                    className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={tags.includes(tag.value)}
                      onChange={() => handleTagToggle(tag.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
