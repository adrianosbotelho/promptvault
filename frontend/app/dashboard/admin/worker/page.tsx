'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { apiClient, WorkerConfig } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function WorkerAdminPage() {
  const [config, setConfig] = useState<WorkerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try { setLoading(true); setError(null); setConfig(await apiClient.getWorkerConfig()); }
    catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load configuration';
      if (!msg.includes('Unauthorized')) setError(msg);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true); setError(null); setSuccessMessage(null);
      setConfig(await apiClient.updateWorkerConfig(config));
      setSuccessMessage('Configuration updated. Some changes may require a server restart.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleChange = (field: keyof WorkerConfig, value: any) => {
    if (config) setConfig({ ...config, [field]: value });
  };

  if (loading) return (
    <AppShell><div className="max-w-4xl mx-auto"><Card><CardContent className="p-4 text-muted-foreground text-sm">Loading configuration...</CardContent></Card></div></AppShell>
  );
  if (!config) return (
    <AppShell><div className="max-w-4xl mx-auto"><div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">Failed to load configuration</div></div></AppShell>
  );

  const Toggle = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-4 bg-muted rounded-md">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-10 h-5 bg-secondary rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
      </label>
    </div>
  );

  const NumberField = ({ label, desc, value, min, max, onChange }: { label: string; desc: string; value: number; min: number; max: number; onChange: (v: number) => void }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input type="number" min={min} max={max} value={value} onChange={(e) => onChange(parseInt(e.target.value) || min)} />
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground mb-1">Worker Configuration</h1>
          <p className="text-xs text-muted-foreground">Configure the background worker that analyzes prompts</p>
        </div>

        {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        {successMessage && <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-400">{successMessage}</div>}

        <Card>
          <CardContent className="p-5 space-y-4">
            <Toggle label="Enable Automatic Worker" desc="Automatically analyze prompts at the configured interval" checked={config.enabled} onChange={(v) => handleChange('enabled', v)} />
            <NumberField label="Analysis Interval (minutes)" desc="1-1440 minutes, default: 5" value={config.interval_minutes} min={1} max={1440} onChange={(v) => handleChange('interval_minutes', v)} />
            <NumberField label="Maximum Prompts per Cycle" desc="1-100, default: 5" value={config.max_prompts} min={1} max={100} onChange={(v) => handleChange('max_prompts', v)} />
            <NumberField label="Maximum Retries per Prompt" desc="0-10, default: 2" value={config.max_retries} min={0} max={10} onChange={(v) => handleChange('max_retries', v)} />
            <Toggle label="Use Free APIs Only" desc="Use only Groq, HuggingFace, Mock to avoid costs" checked={config.use_free_apis_only} onChange={(v) => handleChange('use_free_apis_only', v)} />
            {config.updated_at && <p className="text-xs text-muted-foreground pt-3 border-t">Last updated: {new Date(config.updated_at).toLocaleString()}</p>}
            <div className="flex justify-end pt-3 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardContent className="p-5">
            <h3 className="text-xs font-medium text-primary mb-2">Important Notes</h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Changes are saved immediately</li>
              <li>Running worker may require server restart for full effect</li>
              <li>Settings apply on the next analysis cycle</li>
              <li>Manual analysis available from Dashboard</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
