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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Prompt</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter prompt title"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional description"
          />
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            placeholder="Enter your prompt content here..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Prompt'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
