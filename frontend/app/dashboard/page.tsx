'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, PromptListItem, SemanticSearchResult, GroupedPromptsResponse, PromptStats } from '@/lib/api';
import NewPromptForm from '@/components/NewPromptForm';
import CategorySection from '@/components/CategorySection';
import CategoryBadge from '@/components/CategoryBadge';
import EditPromptModal from '@/components/EditPromptModal';
import DeletePromptModal from '@/components/DeletePromptModal';
import AppShell from '@/components/AppShell';
import { Search, Plus, RefreshCw, Bot, List, Grid, LayoutGrid, Table2, FileText, TrendingUp, Sparkles, GitBranch, FolderOpen } from 'lucide-react';
import PromptCard from '@/components/PromptCard';
import PromptTable from '@/components/PromptTable';
import SmartInput from '@/components/SmartInput';
import { ContextAnalyzeResponse } from '@/lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [groupedPrompts, setGroupedPrompts] = useState<GroupedPromptsResponse | null>(null);
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improvingId, setImprovingId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'grouped'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [editingPrompt, setEditingPrompt] = useState<PromptListItem | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<PromptListItem | null>(null);
  const [runningWorker, setRunningWorker] = useState(false);
  const [stats, setStats] = useState<PromptStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [detectedContext, setDetectedContext] = useState<ContextAnalyzeResponse | null>(null);
  const [newPromptInitialData, setNewPromptInitialData] = useState<{ content?: string; category?: string } | null>(null);
  const smartInputRef = useRef<{ getValue: () => string; getContext: () => ContextAnalyzeResponse | null; clear: () => void } | null>(null);

  // Memoize the context detection callback to prevent infinite loops
  const handleContextDetected = useCallback((context: ContextAnalyzeResponse) => {
    setDetectedContext(context);
  }, []);

  const handleSmartInputNewPrompt = () => {
    const value = smartInputRef.current?.getValue() || '';
    const context = smartInputRef.current?.getContext();
    
    // Map detected_mode to category
    let category: string | undefined;
    if (context && context.confidence > 0.3) {
      if (context.detected_mode === 'dev_delphi') {
        category = 'delphi';
      } else if (context.detected_mode === 'dev_oracle') {
        category = 'oracle';
      } else if (context.detected_mode === 'architecture') {
        category = 'arquitetura';
      }
    }
    
    // Set initial values for the form
    setNewPromptInitialData({
      content: value,
      category: category,
    });
    setShowNewForm(true);
  };

  useEffect(() => {
    loadPrompts();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const data = await apiClient.getPromptStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

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
      const [promptsData, groupedData] = await Promise.all([
        apiClient.getPrompts(),
        apiClient.getGroupedPrompts()
      ]);
      setPrompts(promptsData);
      setGroupedPrompts(groupedData);
    } catch (err) {
      let errorMessage = 'Failed to load prompts';
      if (err instanceof Error) {
        errorMessage = err.message;
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
        `Prompt improved successfully using ${providerName}! New version created.`
      );
      
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
    setNewPromptInitialData(null);
    setShowNewForm(true);
  };

  const handleFormSuccess = () => {
    setShowNewForm(false);
    setNewPromptInitialData(null);
    // Clear Smart Input after successful prompt creation
    smartInputRef.current?.clear();
    loadPrompts();
    loadStats();
  };

  const handleFormCancel = () => {
    setShowNewForm(false);
  };

  const handleRunWorker = async () => {
    try {
      setRunningWorker(true);
      setError(null);
      await apiClient.runAgentWorker(5);
      setSuccessMessage('Agent analysis completed successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadPrompts();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run agent worker');
    } finally {
      setRunningWorker(false);
    }
  };

  const isSearchMode = searchQuery.trim().length > 0;
  const displayPrompts = isSearchMode 
    ? searchResults.map(result => result.prompt)
    : prompts;

  // Pagination
  const totalPages = Math.ceil(displayPrompts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPrompts = displayPrompts.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, viewMode]);

  return (
    <AppShell detectedContext={detectedContext}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Statistics Cards */}
        {loadingStats && (
          <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4">
            <p className="text-[#d8d9da] text-sm">Loading statistics...</p>
          </div>
        )}
        
        {!loadingStats && stats !== null && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Prompts */}
            <div className="bg-gradient-to-br from-[#1f1f23] to-[#2c2c34] rounded-lg border border-[#3274d9]/30 p-5 hover:border-[#3274d9]/50 transition-all shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-[#3274d9]/20 rounded-lg">
                      <FileText className="w-5 h-5 text-[#3274d9]" />
                    </div>
                    <p className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Total Prompts</p>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.total_prompts ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Total Analyzed */}
            <div className="bg-gradient-to-br from-[#1f1f23] to-[#2c2c34] rounded-lg border border-purple-500/30 p-5 hover:border-purple-500/50 transition-all shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Analyzed</p>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.total_analyzed ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Total Improved */}
            <div className="bg-gradient-to-br from-[#1f1f23] to-[#2c2c34] rounded-lg border border-green-500/30 p-5 hover:border-green-500/50 transition-all shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Sparkles className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Improved</p>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.total_improved ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Total Versions */}
            <div className="bg-gradient-to-br from-[#1f1f23] to-[#2c2c34] rounded-lg border border-orange-500/30 p-5 hover:border-orange-500/50 transition-all shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <GitBranch className="w-5 h-5 text-orange-400" />
                    </div>
                    <p className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Versions</p>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.total_versions ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {!loadingStats && !stats && (
          <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4">
            <p className="text-[#d8d9da] text-sm">Failed to load statistics. Check console for details.</p>
          </div>
        )}

        {/* Category Statistics */}
        {stats && Object.keys(stats.total_by_category).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.total_by_category).map(([category, count]) => {
              const getCategoryConfig = (cat: string) => {
                switch (cat.toLowerCase()) {
                  case 'delphi':
                    return { icon: FolderOpen, color: 'blue', bgColor: 'bg-[#3274d9]/20', iconColor: 'text-[#3274d9]', borderColor: 'border-[#3274d9]/30' };
                  case 'oracle':
                    return { icon: FolderOpen, color: 'red', bgColor: 'bg-red-500/20', iconColor: 'text-red-400', borderColor: 'border-red-500/30' };
                  case 'arquitetura':
                    return { icon: FolderOpen, color: 'purple', bgColor: 'bg-purple-500/20', iconColor: 'text-purple-400', borderColor: 'border-purple-500/30' };
                  default:
                    return { icon: FolderOpen, color: 'gray', bgColor: 'bg-[#2c2c34]', iconColor: 'text-[#8c8c8c]', borderColor: 'border-[#2c2c34]' };
                }
              };
              const config = getCategoryConfig(category);
              const IconComponent = config.icon;
              
              return (
                <div key={category} className={`bg-gradient-to-br from-[#1f1f23] to-[#2c2c34] rounded-lg border ${config.borderColor} p-5 hover:border-opacity-50 transition-all shadow-lg`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-2 ${config.bgColor} rounded-lg`}>
                          <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
                        </div>
                        <p className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wide capitalize">{category}</p>
                      </div>
                      <p className="text-2xl font-bold text-white">{count}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {stats.uncategorized_count > 0 && (
              <div className="bg-gradient-to-br from-[#1f1f23] to-[#2c2c34] rounded-lg border border-[#2c2c34] p-5 hover:border-[#3a3a44] transition-all shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-[#2c2c34] rounded-lg">
                        <FolderOpen className="w-5 h-5 text-[#8c8c8c]" />
                      </div>
                      <p className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Uncategorized</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.uncategorized_count}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Smart Input Card */}
        <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#3274d9]" />
              Smart Input
            </h2>
            <p className="text-xs text-[#8c8c8c] mt-1">
              Digite ou cole código/descrição para detecção automática de contexto
            </p>
          </div>
          <SmartInput
            onContextDetected={handleContextDetected}
            placeholder="🔎 Digite ou cole código/descrição..."
            inputRef={smartInputRef}
          />
          {detectedContext && detectedContext.confidence > 0.3 && (
            <div className="mt-3 pt-3 border-t border-[#2c2c34]">
              <button
                onClick={handleSmartInputNewPrompt}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#3274d9] text-white rounded text-sm font-medium hover:bg-[#1f60c4] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Prompt (categorizado)</span>
              </button>
            </div>
          )}
        </div>

        {/* Search and Actions Card */}
        <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8c8c8c]" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="w-full pl-10 pr-4 py-2 bg-[#0b0b0f] border border-[#2c2c34] rounded text-sm text-white placeholder-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-[#3274d9] focus:border-[#3274d9]"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8c8c8c] text-xs">
                  Searching...
                </div>
              )}
            </div>
            {isSearchMode && searchResults.length > 0 && (
              <p className="text-xs text-[#8c8c8c]">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
              </p>
            )}
            {isSearchMode && !searching && searchResults.length === 0 && (
              <p className="text-xs text-[#8c8c8c]">
                No results found for "{searchQuery}"
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 items-center flex-wrap">
              <button
                onClick={handleNewPrompt}
                disabled={showNewForm}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#3274d9] text-white rounded text-sm font-medium hover:bg-[#1f60c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                New Prompt
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  loadPrompts();
                }}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#2c2c34] text-[#d8d9da] rounded text-sm font-medium hover:bg-[#3a3a44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleRunWorker}
                disabled={runningWorker}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#2c2c34] text-[#d8d9da] rounded text-sm font-medium hover:bg-[#3a3a44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Run automatic analysis on latest prompts"
              >
                <Bot className="w-4 h-4" />
                {runningWorker ? 'Analyzing...' : 'Analyze Prompts'}
              </button>
              {!isSearchMode && (
                <div className="ml-auto flex gap-1 bg-[#0b0b0f] rounded p-1 border border-[#2c2c34]">
                  <button
                    onClick={() => setViewMode('grouped')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      viewMode === 'grouped'
                        ? 'bg-[#3274d9] text-white'
                        : 'text-[#d8d9da] hover:bg-[#2c2c34]'
                    }`}
                  >
                    <Grid className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      viewMode === 'table'
                        ? 'bg-[#3274d9] text-white'
                        : 'text-[#d8d9da] hover:bg-[#2c2c34]'
                    }`}
                    title="Table view"
                  >
                    <Table2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-[#3274d9] text-white'
                        : 'text-[#d8d9da] hover:bg-[#2c2c34]'
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* New Prompt Form */}
        {showNewForm && (
          <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4">
            <NewPromptForm 
              onSuccess={handleFormSuccess} 
              onCancel={handleFormCancel}
              initialContent={newPromptInitialData?.content}
              initialCategory={newPromptInitialData?.category}
            />
          </div>
        )}

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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12 text-[#8c8c8c] text-sm">
            Loading prompts...
          </div>
        )}

        {/* Prompts List */}
        {!loading && !isSearchMode && prompts.length === 0 && (
          <div className="text-center py-12 text-[#8c8c8c] text-sm">
            No prompts yet. Create your first prompt!
          </div>
        )}

        {!loading && isSearchMode && !searching && searchResults.length === 0 && (
          <div className="text-center py-12 text-[#8c8c8c] text-sm">
            No results found. Try a different search query.
          </div>
        )}

        {/* Grouped View */}
        {!loading && !isSearchMode && viewMode === 'grouped' && groupedPrompts && (
          <div className="space-y-4">
            {groupedPrompts.by_category
              .filter(cat => cat.category !== null)
              .map((category) => (
                <CategorySection
                  key={category.category || 'uncategorized'}
                  category={category}
                  allPrompts={prompts}
                  onPromptUpdated={loadPrompts}
                />
              ))}
            {groupedPrompts.by_category.find(cat => cat.category === null) && (
              <CategorySection
                category={groupedPrompts.by_category.find(cat => cat.category === null)!}
                allPrompts={prompts}
                onPromptUpdated={loadPrompts}
              />
            )}
          </div>
        )}

        {/* Grid View */}
        {!loading && displayPrompts.length > 0 && (isSearchMode || viewMode === 'grid') && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedPrompts.map((prompt) => {
                const searchResult = isSearchMode 
                  ? searchResults.find(r => r.prompt.id === prompt.id)
                  : null;
                
                return (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onEdit={setEditingPrompt}
                    onDelete={setDeletingPrompt}
                    onImprove={handleImprove}
                    improving={improvingId === prompt.id}
                    similarity={searchResult?.similarity}
                  />
                );
              })}
            </div>

            {/* Pagination for Grid View */}
            {!isSearchMode && totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-xs text-[#8c8c8c]">
                  Showing {startIndex + 1} to {Math.min(endIndex, displayPrompts.length)} of {displayPrompts.length} prompts
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-[#2c2c34] text-[#d8d9da] rounded text-xs font-medium hover:bg-[#3a3a44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-[#3274d9] text-white'
                              : 'bg-[#2c2c34] text-[#d8d9da] hover:bg-[#3a3a44]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-[#2c2c34] text-[#d8d9da] rounded text-xs font-medium hover:bg-[#3a3a44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Table View */}
        {!loading && displayPrompts.length > 0 && viewMode === 'table' && !isSearchMode && (
          <>
            <PromptTable
              prompts={paginatedPrompts}
              onEdit={setEditingPrompt}
              onDelete={setDeletingPrompt}
              onImprove={handleImprove}
              improvingIds={improvingId ? new Set([improvingId]) : new Set()}
            />

            {/* Pagination for Table View */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-[#8c8c8c]">
                  Showing {startIndex + 1} to {Math.min(endIndex, displayPrompts.length)} of {displayPrompts.length} prompts
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-[#2c2c34] text-[#d8d9da] rounded text-xs font-medium hover:bg-[#3a3a44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-[#3274d9] text-white'
                              : 'bg-[#2c2c34] text-[#d8d9da] hover:bg-[#3a3a44]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-[#2c2c34] text-[#d8d9da] rounded text-xs font-medium hover:bg-[#3a3a44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Edit Modal */}
        {editingPrompt && (
          <EditPromptModal
            prompt={editingPrompt}
            isOpen={true}
            onClose={() => setEditingPrompt(null)}
            onSuccess={() => {
              setEditingPrompt(null);
              loadPrompts();
            }}
          />
        )}

        {/* Delete Modal */}
        {deletingPrompt && (
          <DeletePromptModal
            prompt={deletingPrompt}
            isOpen={true}
            onClose={() => setDeletingPrompt(null)}
            onSuccess={() => {
              setDeletingPrompt(null);
              loadPrompts();
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
