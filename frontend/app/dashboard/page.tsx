'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, PromptListItem, SemanticSearchResult } from '@/lib/api';
import NewPromptForm from '@/components/NewPromptForm';

export default function Dashboard() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improvingId, setImprovingId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadPrompts();
  }, []);

  // Debounce search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setSearching(true);
        setError(null);
        const results = await apiClient.searchPrompts(searchQuery.trim(), 10);
        setSearchResults(results);
        setSearching(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search prompts');
        setSearchResults([]);
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getPrompts();
      setPrompts(data);
    } catch (err) {
      let errorMessage = 'Failed to load prompts';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Check if it's a database connection error
        if (errorMessage.includes('Database connection failed') || errorMessage.includes('503')) {
          errorMessage = 'Database connection failed. Please check your DATABASE_URL configuration and ensure PostgreSQL is running. See backend/START_DATABASE.md for instructions.';
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async (id: number) => {
    try {
      setImprovingId(id);
      setError(null);
      setSuccessMessage(null);
      
      const result = await apiClient.improvePrompt(id);
      
      // Show success message
      setSuccessMessage(`Prompt improved successfully! ${result.explanation.substring(0, 100)}...`);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
      
      // Reload prompts to refresh the list
      await loadPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to improve prompt');
    } finally {
      setImprovingId(null);
    }
  };

  const handleNewPrompt = () => {
    setShowNewForm(true);
  };

  const handleFormSuccess = () => {
    setShowNewForm(false);
    loadPrompts();
  };

  const handleFormCancel = () => {
    setShowNewForm(false);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const isSearchMode = searchQuery.trim().length > 0;
  const displayPrompts = isSearchMode 
    ? searchResults.map(result => result.prompt)
    : prompts;

  return (
    <div className="min-h-full bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="🔎 Search prompts..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔎
            </div>
            {searching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                Searching...
              </div>
            )}
          </div>
          {isSearchMode && searchResults.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
          )}
          {isSearchMode && !searching && searchResults.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">
              No results found for "{searchQuery}"
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={handleNewPrompt}
            disabled={showNewForm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            New Prompt
          </button>
          <button
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
              loadPrompts();
            }}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refresh
          </button>
        </div>

        {/* New Prompt Form */}
        {showNewForm && (
          <div className="mb-6">
            <NewPromptForm onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12 text-gray-500">
            Loading prompts...
          </div>
        )}

        {/* Prompts List */}
        {!loading && !isSearchMode && prompts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No prompts yet. Create your first prompt!
          </div>
        )}

        {!loading && isSearchMode && !searching && searchResults.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No results found. Try a different search query.
          </div>
        )}

        {!loading && displayPrompts.length > 0 && (
          <div className="space-y-3">
            {displayPrompts.map((prompt) => {
              // Get similarity score if in search mode
              const searchResult = isSearchMode 
                ? searchResults.find(r => r.prompt.id === prompt.id)
                : null;
              
              return (
                <div
                  key={prompt.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => router.push(`/dashboard/prompts/${prompt.id}`)}>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 hover:text-blue-600">
                          {prompt.name}
                        </h3>
                        {searchResult && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {(searchResult.similarity * 100).toFixed(0)}% match
                          </span>
                        )}
                      </div>
                      {prompt.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {prompt.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Version {prompt.latest_version || 1}</span>
                        <span>
                          Updated {new Date(prompt.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleImprove(prompt.id)}
                      disabled={improvingId === prompt.id}
                      className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {improvingId === prompt.id ? 'Improving...' : 'Improve'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
