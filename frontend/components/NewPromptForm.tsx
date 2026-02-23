'use client';

import { useState } from 'react';
import { apiClient, CreatePromptRequest } from '@/lib/api';

interface NewPromptFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NewPromptForm({ onSuccess, onCancel }: NewPromptFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const promptData: CreatePromptRequest = {
        name: title.trim(), // Use name as required field
        title: title.trim(), // Also include title as alias
        description: description.trim() || undefined,
        content: content.trim(),
      };

      await apiClient.createPrompt(promptData);
      
      // Reset form
      setTitle('');
      setDescription('');
      setContent('');
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prompt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-sm font-semibold text-white mb-4">Create New Prompt</h2>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-400 rounded text-xs">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-xs font-medium text-[#8c8c8c] mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 bg-[#0b0b0f] border border-[#2c2c34] rounded text-sm text-white placeholder-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-[#3274d9] focus:border-[#3274d9]"
            placeholder="Enter prompt title"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-xs font-medium text-[#8c8c8c] mb-1">
            Description
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-[#0b0b0f] border border-[#2c2c34] rounded text-sm text-white placeholder-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-[#3274d9] focus:border-[#3274d9]"
            placeholder="Optional description"
          />
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-xs font-medium text-[#8c8c8c] mb-1">
            Content *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className="w-full px-3 py-2 bg-[#0b0b0f] border border-[#2c2c34] rounded text-sm text-white placeholder-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-[#3274d9] focus:border-[#3274d9] resize-y font-mono"
            placeholder="Enter your prompt content here..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-3 py-2 bg-[#3274d9] text-white rounded text-sm font-medium hover:bg-[#1f60c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Prompt'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-3 py-2 bg-[#2c2c34] text-[#d8d9da] rounded text-sm font-medium hover:bg-[#3a3a44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
