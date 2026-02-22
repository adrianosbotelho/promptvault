'use client';

import { useState } from 'react';
import { PromptListItem } from '@/lib/api';

interface DeletePromptModalProps {
  prompt: PromptListItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeletePromptModal({
  prompt,
  isOpen,
  onClose,
  onSuccess,
}: DeletePromptModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (confirmText !== prompt.name) {
      setError('O nome não confere. Digite o nome exato do prompt para confirmar.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { apiClient } = await import('@/lib/api');
      await apiClient.deletePrompt(prompt.id);
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-red-600">
              Excluir Prompt
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
              Tem certeza que deseja excluir o prompt <strong>"{prompt.name}"</strong>?
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Esta ação não pode ser desfeita. Todas as versões do prompt serão excluídas permanentemente.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Digite o nome do prompt para confirmar:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={prompt.name}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || confirmText !== prompt.name}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Excluindo...' : 'Excluir Permanentemente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
