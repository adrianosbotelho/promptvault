'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, Prompt, PromptVersion, AgentSuggestions } from '@/lib/api';

export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = parseInt(params.id as string);

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<AgentSuggestions | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (promptId) {
      loadPrompt();
    }
  }, [promptId]);

  const loadPrompt = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getPrompt(promptId);
      setPrompt(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    try {
      setImproving(true);
      setError(null);
      setSuccessMessage(null);

      const result = await apiClient.improvePrompt(promptId);

      // Show success message
      setSuccessMessage(`Prompt improved successfully! ${result.explanation.substring(0, 150)}...`);

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);

      // Reload prompt to get updated versions
      await loadPrompt();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to improve prompt');
    } finally {
      setImproving(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      setSuggestions(null);

      const result = await apiClient.analyzePrompt(promptId);
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze prompt');
    } finally {
      setAnalyzing(false);
    }
  };

  const getLatestVersion = (versions: PromptVersion[]): PromptVersion | null => {
    if (!versions || versions.length === 0) return null;
    return versions.reduce((latest, current) =>
      current.version > latest.version ? current : latest
    );
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
  };

  const sortedVersions = prompt?.versions
    ? [...prompt.versions].sort((a, b) => b.version - a.version)
    : [];

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12 text-gray-500">
            Loading prompt...
          </div>
        </div>
      </div>
    );
  }

  if (error && !prompt) {
    return (
      <div className="min-h-full bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="min-h-full bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12 text-gray-500">
            Prompt not found
          </div>
        </div>
      </div>
    );
  }

  const latestVersion = getLatestVersion(prompt.versions);

  return (
    <div className="min-h-full bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900 mb-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{prompt.name}</h1>
            {prompt.description && (
              <p className="text-gray-600 mt-2">{prompt.description}</p>
            )}
          </div>
        </div>

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

        {/* Current Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Current Content
              {latestVersion && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (Version {latestVersion.version})
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !latestVersion}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? 'Analyzing...' : '🧠 Analyze Prompt'}
              </button>
              <button
                onClick={handleImprove}
                disabled={improving || !latestVersion}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {improving ? 'Improving...' : 'Improve'}
              </button>
            </div>
          </div>

          {latestVersion ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {latestVersion.content}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No content available
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500">
            {latestVersion && (
              <span>
                Created: {new Date(latestVersion.created_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Analysis Results */}
        {suggestions && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">🧠 Analysis Results</h2>
              <button
                onClick={() => setSuggestions(null)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>

            {/* Improvement Ideas */}
            {suggestions.improvement_ideas.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  💡 Improvement Ideas ({suggestions.improvement_ideas.length})
                </h3>
                <div className="space-y-3">
                  {suggestions.improvement_ideas.map((idea, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{idea.title}</h4>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            idea.priority === 'high'
                              ? 'bg-red-100 text-red-700'
                              : idea.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {idea.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{idea.description}</p>
                      <p className="text-xs text-gray-600 italic">Reasoning: {idea.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reusable Patterns */}
            {suggestions.reusable_patterns.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  🔄 Reusable Patterns ({suggestions.reusable_patterns.length})
                </h3>
                <div className="space-y-3">
                  {suggestions.reusable_patterns.map((pattern, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <h4 className="font-semibold text-gray-900 mb-2">{pattern.name}</h4>
                      <p className="text-sm text-gray-700 mb-2">{pattern.description}</p>
                      <div className="bg-gray-50 rounded p-2 mb-2">
                        <p className="text-xs text-gray-600 font-mono">{pattern.example}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pattern.use_cases.map((useCase, uIdx) => (
                          <span
                            key={uIdx}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                          >
                            {useCase}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {suggestions.warnings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  ⚠️ Warnings ({suggestions.warnings.length})
                </h3>
                <div className="space-y-3">
                  {suggestions.warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-4 ${
                        warning.severity === 'error'
                          ? 'bg-red-50 border-red-200'
                          : warning.severity === 'warning'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900">{warning.message}</p>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            warning.severity === 'error'
                              ? 'bg-red-200 text-red-800'
                              : warning.severity === 'warning'
                              ? 'bg-yellow-200 text-yellow-800'
                              : 'bg-blue-200 text-blue-800'
                          }`}
                        >
                          {warning.severity}
                        </span>
                      </div>
                      {warning.suggestion && (
                        <p className="text-xs text-gray-600 mt-2">
                          💡 Suggestion: {warning.suggestion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suggestions.improvement_ideas.length === 0 &&
              suggestions.reusable_patterns.length === 0 &&
              suggestions.warnings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No suggestions available at this time.
                </div>
              )}
          </div>
        )}

        {/* Versions History - Git Style */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Version History
          </h2>

          {sortedVersions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No versions available
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line connecting commits */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
              
              <div className="space-y-0">
                {sortedVersions.map((version, index) => {
                  const isLatest = version.version === latestVersion?.version;
                  const date = new Date(version.created_at);
                  const timeAgo = getTimeAgo(date);
                  
                  return (
                    <div key={version.id} className="relative flex items-start pb-6 last:pb-0">
                      {/* Commit circle */}
                      <div className="relative z-10 flex-shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                            isLatest
                              ? 'bg-blue-500 border-blue-600'
                              : 'bg-white border-gray-400'
                          }`}
                        >
                          {isLatest && (
                            <div className="w-3 h-3 rounded-full bg-white"></div>
                          )}
                        </div>
                      </div>

                      {/* Commit content */}
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                          {/* Commit header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                Version {version.version}
                              </span>
                              {isLatest && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                  HEAD
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-mono">{timeAgo}</span>
                              <span>•</span>
                              <span>{date.toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>

                          {/* Commit content */}
                          <div className="mt-3 bg-white rounded border border-gray-200 p-3">
                            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                              {version.content}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
