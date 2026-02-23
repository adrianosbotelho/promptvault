'use client';

import { useState } from 'react';
import { PromptListItem } from '@/lib/api';
import { X } from 'lucide-react';

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
      setError('Name does not match. Type the exact prompt name to confirm.');
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f1f23] rounded border border-[#2c2c34] shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-red-400">
              Delete Prompt
            </h2>
            <button
              onClick={onClose}
              className="text-[#8c8c8c] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-xs text-[#d8d9da] mb-2">
              Are you sure you want to delete the prompt <strong className="text-white">"{prompt.name}"</strong>?
            </p>
            <p className="text-xs text-[#8c8c8c] mb-4">
              This action cannot be undone. All versions of the prompt will be permanently deleted.
            </p>
            
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#8c8c8c] mb-1">
                Type the prompt name to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b0b0f] border border-[#2c2c34] rounded text-sm text-white placeholder-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder={prompt.name}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 text-red-400 rounded text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 bg-[#2c2c34] text-[#d8d9da] rounded text-sm font-medium hover:bg-[#3a3a44] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || confirmText !== prompt.name}
              className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 rounded text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/50"
            >
              {loading ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
