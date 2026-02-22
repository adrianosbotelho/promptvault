'use client';

import { useState, useEffect } from 'react';
import { PromptListItem, PromptCategory, PromptTag } from '@/lib/api';

interface EditPromptModalProps {
  prompt: PromptListItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: { value: PromptCategory | null; label: string }[] = [
  { value: null, label: 'Sem Categoria' },
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

export default function EditPromptModal({
  prompt,
  isOpen,
  onClose,
  onSuccess,
}: EditPromptModalProps) {
  const [name, setName] = useState(prompt.name);
  const [description, setDescription] = useState(prompt.description || '');
  const [category, setCategory] = useState<PromptCategory | null>(
    (prompt.category as PromptCategory) || null
  );
  const [tags, setTags] = useState<PromptTag[]>(
    (prompt.tags as PromptTag[]) || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(prompt.name);
      setDescription(prompt.description || '');
      setCategory((prompt.category as PromptCategory) || null);
      setTags((prompt.tags as PromptTag[]) || []);
    }
  }, [isOpen, prompt]);

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
      await apiClient.updatePrompt(prompt.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update prompt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Editar Prompt
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do prompt"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descrição do prompt"
              />
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat.value || 'none'}
                    className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value || ''}
                      checked={category === cat.value}
                      onChange={() => setCategory(cat.value)}
                      className="mr-3"
                    />
                    <span className="text-sm">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags Selection */}
            <div>
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
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
