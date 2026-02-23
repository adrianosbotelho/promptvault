'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { apiClient } from '@/lib/api';
import { Bot, Play, Settings } from 'lucide-react';
import Link from 'next/link';

export default function AgentPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAgent = async () => {
    try {
      setRunning(true);
      setError(null);
      setResult(null);
      
      const response = await apiClient.runAgentWorker();
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run agent');
    } finally {
      setRunning(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Agent Info Card */}
        <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#2c2c34] rounded">
              <Bot className="w-6 h-6 text-[#3274d9]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white mb-2">AI Agent</h2>
              <p className="text-sm text-[#8c8c8c] mb-4">
                The agent analyzes your prompts, suggests improvements, identifies reusable patterns, 
                and provides warnings about potential issues.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleRunAgent}
                  disabled={running}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3274d9] text-white rounded text-sm font-medium hover:bg-[#1f60c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  {running ? 'Running...' : 'Run Agent Now'}
                </button>
                <Link
                  href="/dashboard/admin/worker"
                  className="flex items-center gap-2 px-4 py-2 bg-[#2c2c34] text-[#d8d9da] rounded text-sm font-medium hover:bg-[#3a3a44] transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Configure
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-[#1f1f23] rounded border border-green-500/50 p-4">
            <h3 className="font-semibold text-green-400 mb-2 text-sm">Agent Run Completed</h3>
            <div className="text-xs text-[#d8d9da] space-y-1">
              <p>Analyzed: {result.results?.analyzed_count || 0} prompts</p>
              <p>Errors: {result.results?.error_count || 0}</p>
              <p>Skipped: {result.results?.skipped_count || 0}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-[#1f1f23] rounded border border-red-500/50 p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* How it works */}
        <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-6">
          <h3 className="font-semibold text-white mb-3 text-sm">How it works</h3>
          <ul className="space-y-2 text-xs text-[#d8d9da]">
            <li>• Analyzes your latest prompts using AI</li>
            <li>• Generates improvement suggestions</li>
            <li>• Identifies reusable patterns</li>
            <li>• Provides warnings about potential issues</li>
            <li>• Stores results as Insights for review</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
