'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { apiClient, ArchitectProfile } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Plus, X, User, Brain, Target, AlertTriangle, Layers } from 'lucide-react';

// Editable list of string tags
function TagListEditor({
  label,
  icon: Icon,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  icon: React.ElementType;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput('');
  };

  const remove = (item: string) => onChange(values.filter(v => v !== item));

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </label>
      <div className="flex flex-wrap gap-1.5 min-h-8">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/30 rounded-full px-2.5 py-0.5">
            {v}
            <button onClick={() => remove(v)} className="hover:text-destructive transition-colors">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs text-muted-foreground italic">Nenhum item ainda</span>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 h-8 rounded-md border border-input bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button variant="outline" size="sm" onClick={add} disabled={!input.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ArchitectProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local editable state
  const [preferredPatterns, setPreferredPatterns] = useState<string[]>([]);
  const [recurringDecisions, setRecurringDecisions] = useState<string[]>([]);
  const [commonDomains, setCommonDomains] = useState<string[]>([]);
  const [riskTendencies, setRiskTendencies] = useState<string[]>([]);
  const [optimizationFocus, setOptimizationFocus] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    apiClient.getProfile()
      .then(p => {
        setProfile(p);
        setPreferredPatterns(p.preferred_patterns ?? []);
        setRecurringDecisions(p.recurring_decisions ?? []);
        setCommonDomains(p.common_domains ?? []);
        setRiskTendencies(p.risk_tendencies ?? []);
        setOptimizationFocus(p.optimization_focus ?? []);
        setNotes(p.notes ?? '');
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Falha ao carregar perfil'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true); setError(null); setSaved(false);
      const updated = await apiClient.updateProfile({
        preferred_patterns: preferredPatterns,
        recurring_decisions: recurringDecisions,
        common_domains: commonDomains,
        risk_tendencies: riskTendencies,
        optimization_focus: optimizationFocus,
        notes: notes || undefined,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Perfil do Arquiteto</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Personalize o Architect Mentor com seus padrões e domínios preferidos.
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Salvando...</> : <><Save className="h-4 w-4 mr-1" /> Salvar</>}
            </Button>
          </CardContent>
        </Card>

        {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        {saved && <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-400">Perfil salvo com sucesso.</div>}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando perfil...</div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-5">
                <TagListEditor
                  label="Padrões Preferidos"
                  icon={Brain}
                  values={preferredPatterns}
                  onChange={setPreferredPatterns}
                  placeholder="ex: Repository, CQRS, Clean Architecture..."
                />
                <TagListEditor
                  label="Domínios Frequentes"
                  icon={Layers}
                  values={commonDomains}
                  onChange={setCommonDomains}
                  placeholder="ex: Delphi, Oracle, APIs REST, Python..."
                />
                <TagListEditor
                  label="Foco de Otimização"
                  icon={Target}
                  values={optimizationFocus}
                  onChange={setOptimizationFocus}
                  placeholder="ex: performance, manutenibilidade, testabilidade..."
                />
                <TagListEditor
                  label="Tendências de Risco"
                  icon={AlertTriangle}
                  values={riskTendencies}
                  onChange={setRiskTendencies}
                  placeholder="ex: adoção antecipada de libs, acoplamento alto..."
                />
                <TagListEditor
                  label="Decisões Recorrentes"
                  icon={Brain}
                  values={recurringDecisions}
                  onChange={setRecurringDecisions}
                  placeholder="ex: monolito vs. microserviços, ORM vs. raw SQL..."
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Notas Livres</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Contexto adicional sobre sua stack, equipe, restrições ou preferências..."
                  rows={5}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </CardContent>
            </Card>

            {/* Preview */}
            {(preferredPatterns.length > 0 || commonDomains.length > 0 || optimizationFocus.length > 0) && (
              <Card className="border-purple-500/30">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-purple-400 mb-2">Como o Architect Mentor vai usar este perfil</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O Mentor priorizará insights relacionados a{' '}
                    {commonDomains.length > 0 && <><strong>{commonDomains.join(', ')}</strong>{' '}</>}
                    {preferredPatterns.length > 0 && <>e padrões como <strong>{preferredPatterns.join(', ')}</strong>{' '}</>}
                    {optimizationFocus.length > 0 && <>com foco em <strong>{optimizationFocus.join(', ')}</strong></>}.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
