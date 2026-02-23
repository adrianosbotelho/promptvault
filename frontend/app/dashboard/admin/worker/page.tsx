'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { apiClient, WorkerConfig } from '@/lib/api';

export default function WorkerAdminPage() {
  const [config, setConfig] = useState<WorkerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getWorkerConfig();
      setConfig(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load worker configuration';
      setError(errorMessage);
      
      // If unauthorized, the apiClient will handle redirect
      if (errorMessage.includes('Unauthorized')) {
        return; // Don't show error, redirect is happening
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updated = await apiClient.updateWorkerConfig(config);
      setConfig(updated);
      setSuccessMessage('Worker configuration updated successfully! Note: Changes may require server restart to take full effect.');

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update worker configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof WorkerConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4">
            <p className="text-[#8c8c8c] text-sm">Loading worker configuration...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!config) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1f1f23] rounded border border-red-500/50 p-4">
            <p className="text-red-400 text-sm">Failed to load worker configuration</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-white mb-1">Worker Configuration</h1>
          <p className="text-xs text-[#8c8c8c]">Configure the automatic background worker that analyzes prompts</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-[#1f1f23] rounded border border-red-500/50 p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-[#1f1f23] rounded border border-green-500/50 p-4">
            <p className="text-green-400 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-[#1f1f23] rounded border border-[#2c2c34] p-4 space-y-4">
          {/* Enable/Disable Worker */}
          <div className="flex items-center justify-between p-4 bg-[#0b0b0f] rounded border border-[#2c2c34]">
            <div>
              <label className="text-sm font-medium text-white">Enable Automatic Worker</label>
              <p className="text-xs text-[#8c8c8c] mt-1">
                When enabled, the worker will automatically analyze prompts at the configured interval
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#2c2c34] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#3274d9] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#2c2c34] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3274d9]"></div>
            </label>
          </div>

          {/* Interval Minutes */}
          <div>
            <label className="block text-xs font-medium text-[#8c8c8c] mb-1">
              Analysis Interval (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={config.interval_minutes}
              onChange={(e) => handleChange('interval_minutes', parseInt(e.target.value) || 5)}
              className="w-full px-3 py-2 bg-[#0b0b0f] border border-[#2c2c34] rounded text-sm text-white placeholder-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-[#3274d9] focus:border-[#3274d9]"
            />
            <p className="text-xs text-[#8c8c8c] mt-1">
              How often the worker should analyze prompts (1-1440 minutes, default: 5)
            </p>
          </div>

          {/* Max Prompts */}
          <div>
            <label className="block text-xs font-medium text-[#8c8c8c] mb-1">
              Maximum Prompts per Cycle
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.max_prompts}
              onChange={(e) => handleChange('max_prompts', parseInt(e.target.value) || 5)}
              className="w-full px-3 py-2 bg-[#0b0b0f] border border-[#2c2c34] rounded text-sm text-white placeholder-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-[#3274d9] focus:border-[#3274d9]"
            />
            <p className="text-xs text-[#8c8c8c] mt-1">
              Maximum number of prompts to analyze in each cycle (1-100, default: 5)
            </p>
          </div>

          {/* Max Retries */}
          <div>
            <label className="block text-xs font-medium text-[#8c8c8c] mb-1">
              Maximum Retries per Prompt
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={config.max_retries}
              onChange={(e) => handleChange('max_retries', parseInt(e.target.value) || 2)}
              className="w-full px-3 py-2 bg-[#0b0b0f] border border-[#2c2c34] rounded text-sm text-white placeholder-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-[#3274d9] focus:border-[#3274d9]"
            />
            <p className="text-xs text-[#8c8c8c] mt-1">
              Number of times to retry analyzing a prompt if it fails (0-10, default: 2)
            </p>
          </div>

          {/* Use Free APIs Only */}
          <div className="flex items-center justify-between p-4 bg-[#0b0b0f] rounded border border-[#2c2c34]">
            <div>
              <label className="text-sm font-medium text-white">Use Free APIs Only</label>
              <p className="text-xs text-[#8c8c8c] mt-1">
                When enabled, the worker will only use free APIs (Groq, HuggingFace, Mock) to avoid costs
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.use_free_apis_only}
                onChange={(e) => handleChange('use_free_apis_only', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#2c2c34] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#3274d9] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#2c2c34] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3274d9]"></div>
            </label>
          </div>

          {/* Last Updated */}
          {config.updated_at && (
            <div className="pt-4 border-t border-[#2c2c34]">
              <p className="text-xs text-[#8c8c8c]">
                Last updated: {new Date(config.updated_at).toLocaleString()}
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-[#2c2c34]">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#3274d9] text-white rounded text-sm font-medium hover:bg-[#1f60c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-[#1f1f23] rounded border border-[#3274d9]/50 p-4">
          <h3 className="text-xs font-medium text-[#3274d9] mb-2">Important Notes</h3>
          <ul className="text-xs text-[#d8d9da] space-y-1 list-disc list-inside">
            <li>Changes to the worker configuration are saved immediately</li>
            <li>If the worker is running, you may need to restart the server for some changes to take full effect</li>
            <li>The worker will use the configured settings on the next analysis cycle</li>
            <li>You can manually trigger an analysis from the Dashboard using the "Analyze Prompts" button</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
