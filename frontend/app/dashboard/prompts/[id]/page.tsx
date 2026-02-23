'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, Prompt, PromptVersion, AgentSuggestions, PromptListItem } from '@/lib/api';
import EditPromptModal from '@/components/EditPromptModal';
import DeletePromptModal from '@/components/DeletePromptModal';
import AppShell from '@/components/AppShell';

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
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [deletingPrompt, setDeletingPrompt] = useState(false);

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

      // Get provider from the latest version
      const latestVersion = result.versions && result.versions.length > 0
        ? result.versions.reduce((latest, current) => 
            current.version > latest.version ? current : latest
          )
        : null;

      // Determine provider display name
      const provider = latestVersion?.improved_by || 'Unknown';
      const providerName = provider === 'MockLLMProvider' 
        ? 'Mock (simulado)' 
        : provider === 'GroqProvider'
        ? 'Groq API'
        : provider === 'OpenAIProvider'
        ? 'OpenAI API'
        : provider;

      // Show success message with provider info
      setSuccessMessage(
        `Prompt melhorado com sucesso usando ${providerName}! Nova versão criada.`
      );

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
      <AppShell>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12 text-[#8c8c8c] text-sm">
            Loading prompt...
          </div>
        </div>
      </AppShell>
    );
  }

  if (error && !prompt) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="bg-[#1f1f23] rounded border border-red-500/50 p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1.5 bg-[#2c2c34] text-[#d8d9da] rounded text-sm font-medium hover:bg-[#3a3a44] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </AppShell>
    );
  }

  if (!prompt) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12 text-[#8c8c8c] text-sm">
            Prompt not found
          </div>
        </div>
      </AppShell>
    );
  }

  const latestVersion = getLatestVersion(prompt.versions);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-xs text-[#8c8c8c] hover:text-white mb-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold text-white">{prompt.name}</h1>
              {prompt.description && (
                <p className="text-sm text-[#8c8c8c] mt-1">{prompt.description}</p>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => setEditingPrompt(true)}
                className="px-3 py-1.5 bg-[#3274d9] text-white rounded text-sm font-medium hover:bg-[#1f60c4] transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setDeletingPrompt(true)}
                className="px-3 py-1.5 bg-[#2c2c34] text-red-400 rounded text-sm font-medium hover:bg-[#3a3a44] transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-[#1f1f23] rounded border border-red-500/50 p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-[#1f1f23] rounded border border-green-500/50 p-3">
            <p className="text-green-400 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Current Content */}
        <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">
              Current Content
              {latestVersion && (
                <span className="ml-2 text-xs font-normal text-[#8c8c8c]">
                  (v{latestVersion.version})
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !latestVersion}
                className="px-3 py-1.5 bg-[#2c2c34] text-[#d8d9da] rounded text-sm font-medium hover:bg-[#3a3a44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? 'Analyzing...' : 'Analyze'}
              </button>
              <button
                onClick={handleImprove}
                disabled={improving || !latestVersion}
                className="px-3 py-1.5 bg-[#3274d9] text-white rounded text-sm font-medium hover:bg-[#1f60c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {improving ? 'Improving...' : 'Improve'}
              </button>
            </div>
          </div>

          {latestVersion ? (
            <div className="bg-[#0b0b0f] rounded p-4 border border-[#2c2c34]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {latestVersion.improved_by && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      latestVersion.improved_by === 'MockLLMProvider'
                        ? 'bg-[#2c2c34] text-[#8c8c8c]'
                        : latestVersion.improved_by === 'GroqProvider'
                        ? 'bg-[#3274d9]/20 text-[#3274d9]'
                        : latestVersion.improved_by === 'OpenAIProvider'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-[#3274d9]/20 text-[#3274d9]'
                    }`}>
                      {latestVersion.improved_by === 'MockLLMProvider' 
                        ? 'Mock' 
                        : latestVersion.improved_by === 'GroqProvider'
                        ? 'Groq'
                        : latestVersion.improved_by === 'OpenAIProvider'
                        ? 'OpenAI'
                        : latestVersion.improved_by}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#8c8c8c]">
                  {new Date(latestVersion.created_at).toLocaleString()}
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-xs text-[#d8d9da] font-mono leading-relaxed">
                {latestVersion.content}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8 text-[#8c8c8c] text-sm">
              No content available
            </div>
          )}
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
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Improvement Ideas ({suggestions.improvement_ideas.length})
                </h3>
                <div className="space-y-2">
                  {suggestions.improvement_ideas.map((idea, idx) => (
                    <div
                      key={idx}
                      className="border border-[#2c2c34] rounded p-3 hover:border-[#3274d9]/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-white text-sm">{idea.title}</h4>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            idea.priority === 'high'
                              ? 'bg-red-500/20 text-red-400'
                              : idea.priority === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-[#3274d9]/20 text-[#3274d9]'
                          }`}
                        >
                          {idea.priority}
                        </span>
                      </div>
                      <p className="text-xs text-[#d8d9da] mb-1">{idea.description}</p>
                      <p className="text-xs text-[#8c8c8c] italic">Reasoning: {idea.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reusable Patterns */}
            {suggestions.reusable_patterns.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Reusable Patterns ({suggestions.reusable_patterns.length})
                </h3>
                <div className="space-y-2">
                  {suggestions.reusable_patterns.map((pattern, idx) => (
                    <div
                      key={idx}
                      className="border border-[#2c2c34] rounded p-3 hover:border-[#3274d9]/50 transition-colors"
                    >
                      <h4 className="font-semibold text-white mb-1 text-sm">{pattern.name}</h4>
                      <p className="text-xs text-[#d8d9da] mb-2">{pattern.description}</p>
                      <div className="bg-[#0b0b0f] rounded p-2 mb-2 border border-[#2c2c34]">
                        <p className="text-xs text-[#8c8c8c] font-mono">{pattern.example}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pattern.use_cases.map((useCase, uIdx) => (
                          <span
                            key={uIdx}
                            className="px-2 py-0.5 text-xs bg-[#3274d9]/20 text-[#3274d9] rounded"
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
                <h3 className="text-sm font-semibold text-white mb-3">
                  Warnings ({suggestions.warnings.length})
                </h3>
                <div className="space-y-2">
                  {suggestions.warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className={`border rounded p-3 ${
                        warning.severity === 'error'
                          ? 'bg-red-500/10 border-red-500/50'
                          : warning.severity === 'warning'
                          ? 'bg-yellow-500/10 border-yellow-500/50'
                          : 'bg-[#3274d9]/10 border-[#3274d9]/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-medium text-white">{warning.message}</p>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            warning.severity === 'error'
                              ? 'bg-red-500/20 text-red-400'
                              : warning.severity === 'warning'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-[#3274d9]/20 text-[#3274d9]'
                          }`}
                        >
                          {warning.severity}
                        </span>
                      </div>
                      {warning.suggestion && (
                        <p className="text-xs text-[#8c8c8c] mt-1">
                          Suggestion: {warning.suggestion}
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
                <div className="text-center py-8 text-[#8c8c8c] text-sm">
                  No suggestions available at this time.
                </div>
              )}
          </div>
        )}

        {/* Versions History - Git Style */}
        <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4">
          <h2 className="text-sm font-semibold text-white mb-4">
            Version History
          </h2>

          {sortedVersions.length === 0 ? (
            <div className="text-center py-8 text-[#8c8c8c] text-sm">
              No versions available
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line connecting commits */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#2c2c34]"></div>
              
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
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isLatest
                              ? 'bg-[#3274d9] border-[#3274d9]'
                              : 'bg-[#1f1f23] border-[#2c2c34]'
                          }`}
                        >
                          {isLatest && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                      </div>

                      {/* Commit content */}
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="bg-[#0b0b0f] rounded border border-[#2c2c34] p-3 hover:border-[#3274d9]/50 transition-colors">
                          {/* Commit header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white text-sm">
                                v{version.version}
                              </span>
                              {isLatest && (
                                <span className="px-1.5 py-0.5 text-xs font-medium bg-[#3274d9]/20 text-[#3274d9] rounded">
                                  HEAD
                                </span>
                              )}
                              {version.improved_by && (
                                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                                  version.improved_by === 'MockLLMProvider'
                                    ? 'bg-[#2c2c34] text-[#8c8c8c]'
                                    : version.improved_by === 'GroqProvider'
                                    ? 'bg-[#3274d9]/20 text-[#3274d9]'
                                    : version.improved_by === 'OpenAIProvider'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-[#3274d9]/20 text-[#3274d9]'
                                }`}>
                                  {version.improved_by === 'MockLLMProvider' 
                                    ? 'Mock' 
                                    : version.improved_by === 'GroqProvider'
                                    ? 'Groq'
                                    : version.improved_by === 'OpenAIProvider'
                                    ? 'OpenAI'
                                    : version.improved_by}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#8c8c8c]">
                              <span className="font-mono">{timeAgo}</span>
                              <span>•</span>
                              <span>{date.toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Commit content */}
                          <div className="mt-2 bg-[#1f1f23] rounded border border-[#2c2c34] p-2">
                            <pre className="whitespace-pre-wrap text-xs text-[#d8d9da] font-mono leading-relaxed">
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

        {/* Edit Modal */}
        {editingPrompt && prompt && (
          <EditPromptModal
            prompt={{
              id: prompt.id,
              name: prompt.name,
              description: prompt.description,
              category: prompt.category,
              tags: prompt.tags,
              created_at: prompt.created_at,
              updated_at: prompt.updated_at,
            }}
            isOpen={true}
            onClose={() => setEditingPrompt(false)}
            onSuccess={() => {
              setEditingPrompt(false);
              loadPrompt();
            }}
          />
        )}

        {/* Delete Modal */}
        {deletingPrompt && prompt && (
          <DeletePromptModal
            prompt={{
              id: prompt.id,
              name: prompt.name,
              description: prompt.description,
              category: prompt.category,
              tags: prompt.tags,
              created_at: prompt.created_at,
              updated_at: prompt.updated_at,
            }}
            isOpen={true}
            onClose={() => setDeletingPrompt(false)}
            onSuccess={() => {
              router.push('/dashboard');
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
