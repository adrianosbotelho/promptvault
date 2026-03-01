'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, SpecialistBuildResponse, MentorSummaryItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Copy, Check, Loader2, ChevronDown, ChevronUp,
  Save, ExternalLink, Brain, Zap, ThumbsUp, ThumbsDown, Download, LayoutTemplate,
  History, X,
} from 'lucide-react';

const SPECIALIZATION_OPTIONS: {
  value: string;
  label: string;
  hint: string;
  domain: string;
  category: string;
}[] = [
  {
    value: 'delphi_debug',
    label: 'Delphi Debug',
    hint: 'Inclua: tipo da exceção (ex: EDivByZero), unit/form envolvida, o que dispara o erro, versão do Delphi e componentes relevantes.',
    domain: 'delphi',
    category: 'delphi',
  },
  {
    value: 'delphi_refactor',
    label: 'Delphi Refactor',
    hint: 'Inclua: unit/classe alvo, o problema específico (ex: "CalcTotal com 300 linhas"), o que deve ser preservado e a versão do Delphi.',
    domain: 'delphi',
    category: 'delphi',
  },
  {
    value: 'delphi_architecture',
    label: 'Delphi Architecture',
    hint: 'Inclua: tipo do sistema, estrutura atual (DataModules, camadas), a decisão ou problema arquitetural e restrições de compatibilidade.',
    domain: 'delphi',
    category: 'delphi',
  },
  {
    value: 'plsql_debug',
    label: 'PLSQL Debug',
    hint: 'Inclua: nome do package/procedure, sintoma observado (tempo, erro ORA-), tabelas envolvidas, versão Oracle e plano de execução se disponível.',
    domain: 'oracle',
    category: 'oracle',
  },
  {
    value: 'plsql_refactor',
    label: 'PLSQL Refactor',
    hint: 'Inclua: objeto alvo, anti-padrão específico (ex: "cursor loop em 500k registros"), comportamento que deve ser preservado e meta de performance.',
    domain: 'oracle',
    category: 'oracle',
  },
  {
    value: 'plsql_architecture',
    label: 'PLSQL Architecture',
    hint: 'Inclua: domínio de negócio, estado atual dos packages/schema, volumes de dados, decisão arquitetural e restrições da versão Oracle.',
    domain: 'oracle',
    category: 'oracle',
  },
  {
    value: 'python_debug',
    label: 'Python Debug',
    hint: 'Inclua: traceback completo, versão do Python e bibliotecas relevantes, se é código sync/async, framework usado e o menor snippet que reproduz o erro.',
    domain: 'python',
    category: 'python',
  },
  {
    value: 'python_refactor',
    label: 'Python Refactor',
    hint: 'Inclua: módulo/classe/função alvo, o anti-padrão específico (ex: "função de 200 linhas mistura DB + lógica + formatação"), o que deve ser preservado e versão do Python.',
    domain: 'python',
    category: 'python',
  },
  {
    value: 'sql_query',
    label: 'SQL Query',
    hint: 'Inclua: banco de dados e versão (ex: PostgreSQL 15), schemas das tabelas envolvidas, a query atual, resultado esperado vs. obtido e contagem aproximada de linhas.',
    domain: 'sql',
    category: 'sql',
  },
  {
    value: 'api_design',
    label: 'API Design',
    hint: 'Inclua: estilo da API (REST/GraphQL/gRPC), domínio de negócio e recurso sendo desenhado, quem vai consumir a API, decisão ou problema específico e restrições de compatibilidade.',
    domain: 'api',
    category: 'api',
  },
];

interface PromptStudioProps {
  initialIdea?: string;
  initialSpec?: string;
  forceOpen?: boolean;
}

export default function PromptStudio({ initialIdea, initialSpec, forceOpen }: PromptStudioProps) {
  const router = useRouter();

  const resolvedSpec = initialSpec && SPECIALIZATION_OPTIONS.find(o => o.value === initialSpec)
    ? initialSpec
    : SPECIALIZATION_OPTIONS[0].value;

  const [expanded, setExpanded] = useState(forceOpen ?? false);
  const [idea, setIdea] = useState(initialIdea ?? '');
  const [specialization, setSpecialization] = useState(resolvedSpec);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpecialistBuildResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [savedPromptId, setSavedPromptId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auto-analyze state
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeDone, setAnalyzeDone] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState<'useful' | 'not_useful' | null>(null);

  // Save as template state
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savedTemplateId, setSavedTemplateId] = useState<number | null>(null);

  // Session history
  const [sessionHistory, setSessionHistory] = useState<Array<{
    id: number;
    idea: string;
    specialization: string;
    result: SpecialistBuildResponse;
    timestamp: Date;
  }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Mentor patterns for selected domain
  const [mentorPatterns, setMentorPatterns] = useState<MentorSummaryItem[]>([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);

  const selectedOption = SPECIALIZATION_OPTIONS.find(o => o.value === specialization);
  const selectedLabel = selectedOption?.label;
  const selectedHint = selectedOption?.hint;
  const selectedDomain = selectedOption?.domain ?? '';
  const selectedCategory = selectedOption?.category ?? '';

  // When initialIdea/initialSpec change from outside (query params), sync state
  useEffect(() => {
    if (initialIdea) setIdea(initialIdea);
    if (initialSpec && SPECIALIZATION_OPTIONS.find(o => o.value === initialSpec)) {
      setSpecialization(initialSpec);
    }
    if (forceOpen) setExpanded(true);
  }, [initialIdea, initialSpec, forceOpen]);

  // Fetch mentor patterns when specialization changes and panel is open
  useEffect(() => {
    if (!expanded || !selectedDomain) return;
    let cancelled = false;
    setLoadingPatterns(true);
    setMentorPatterns([]);
    apiClient.getMentorSummary(selectedDomain)
      .then(summary => {
        if (!cancelled) setMentorPatterns(summary.detected_patterns.slice(0, 3));
      })
      .catch(() => { /* silent — patterns are optional context */ })
      .finally(() => { if (!cancelled) setLoadingPatterns(false); });
    return () => { cancelled = true; };
  }, [specialization, expanded, selectedDomain]);

  const handleGenerate = async () => {
    const trimmed = idea.trim();
    if (!trimmed) { setError('Descreva sua ideia para gerar o prompt.'); return; }
    setError(null); setResult(null); setLoading(true);
    setSavedPromptId(null); setSaveError(null); setAnalyzeDone(false);
    try {
      const generated = await apiClient.buildExpertPrompt(trimmed, specialization);
      setResult(generated);
      setSessionHistory(prev => [
        { id: Date.now(), idea: trimmed, specialization, result: generated, timestamp: new Date() },
        ...prev.slice(0, 9),
      ]);
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Falha ao gerar o prompt.'); }
    finally { setLoading(false); }
  };

  const handleCopyMarkdown = async () => {
    if (!result?.markdown_prompt) return;
    try {
      await navigator.clipboard.writeText(result.markdown_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setError('Falha ao copiar.'); }
  };

  const handleSave = async () => {
    if (!result?.markdown_prompt) return;
    setSaving(true); setSaveError(null);
    try {
      const name = idea.trim().slice(0, 60) || 'Prompt do Studio';
      const saved = await apiClient.createPrompt({
        name,
        content: result.markdown_prompt,
        category: selectedCategory,
        tags: ['studio', specialization],
        description: `Gerado pelo Prompt Studio — especialista: ${result.applied_specialist}`,
      });
      setSavedPromptId(saved.id);

      // Auto-analyze in background
      setAnalyzing(true);
      apiClient.analyzePrompt(saved.id)
        .then(() => { setAnalyzeDone(true); })
        .catch(() => { /* silent — analyze is best-effort */ })
        .finally(() => { setAnalyzing(false); });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleSpecChange = (value: string) => {
    setSpecialization(value);
    setResult(null);
    setSavedPromptId(null);
    setSaveError(null);
    setAnalyzeDone(false);
    setFeedback(null);
    setSavedTemplateId(null);
  };

  const handleSaveAsTemplate = async () => {
    if (!result?.markdown_prompt) return;
    try {
      setSavingTemplate(true);
      const templateName = `${selectedLabel} — ${idea.slice(0, 50).trim()}${idea.length > 50 ? '...' : ''}`;
      const saved = await apiClient.createTemplate({
        name: templateName,
        content: result.markdown_prompt,
        specialization: specialization,
        category: selectedCategory || undefined,
      });
      setSavedTemplateId(saved.id);
    } catch { /* silent */ }
    finally { setSavingTemplate(false); }
  };

  const handleFeedback = async (useful: boolean) => {
    setFeedback(useful ? 'useful' : 'not_useful');
    try { await apiClient.specialistFeedback(specialization, useful); } catch { /* silent */ }
  };

  const handleExportMd = () => {
    if (!result?.markdown_prompt) return;
    const blob = new Blob([result.markdown_prompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt_${specialization}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-l-4 border-l-primary rounded-lg overflow-hidden shadow-[0_4px_14px_rgba(0,0,0,0.3),0_0_0_1px_rgba(47,129,247,0.15)] bg-card">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-card hover:bg-accent transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-amber-400" /> Prompt Studio
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {!expanded && (
            <>
              {loading && <span className="flex items-center gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Gerando...</span>}
              {!loading && result && !savedPromptId && <Badge variant="green" className="text-[10px]">Prompt pronto</Badge>}
              {!loading && savedPromptId && <Badge variant="green" className="text-[10px]">Salvo no Vault</Badge>}
              {!loading && !result && <Badge variant="secondary" className="text-[10px]">{selectedLabel}</Badge>}
            </>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="px-3 pb-4 pt-0 border-t space-y-3">
          <p className="text-xs text-muted-foreground mt-3">
            Escolha o especialista, leia a dica e descreva sua ideia. O pipeline expande o contexto e gera um prompt profissional pronto para GPT/Claude/Cursor.
          </p>

          {/* Specialization select */}
          <select
            value={specialization}
            onChange={(e) => handleSpecChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {SPECIALIZATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-card text-foreground">{opt.label}</option>
            ))}
          </select>

          {/* Specialist hint */}
          {selectedHint && (
            <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <span className="text-amber-400 mt-0.5 shrink-0">💡</span>
              <p className="text-xs text-muted-foreground leading-relaxed">{selectedHint}</p>
            </div>
          )}

          {/* Mentor patterns for this domain */}
          {!loadingPatterns && mentorPatterns.length > 0 && (
            <div className="rounded-md border border-purple-500/30 bg-purple-500/5 px-3 py-2 space-y-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Brain className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs font-medium text-purple-400">Padrões detectados no seu vault</span>
              </div>
              {mentorPatterns.map((p, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-purple-400 text-xs mt-0.5">•</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {p.text}
                    {p.prompt_name && (
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/prompts/${p.prompt_id}`)}
                        className="ml-1 text-purple-400 hover:underline"
                      >
                        ({p.prompt_name})
                      </button>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Idea textarea */}
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Descreva sua ideia com o máximo de contexto possível..."
            rows={4}
          />

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={loading} className="flex-1">
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Gerando...</>
                : <><Sparkles className="h-4 w-4 mr-1" /> Gerar Prompt Especializado</>}
            </Button>
            {sessionHistory.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(v => !v)}
                className="px-2.5 shrink-0"
                title="Histórico da sessão"
              >
                <History className="h-4 w-4" />
                <span className="ml-1 text-xs">{sessionHistory.length}</span>
              </Button>
            )}
          </div>

          {/* Session history panel */}
          {showHistory && sessionHistory.length > 0 && (
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-muted-foreground" /> Histórico da sessão
                </span>
                <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {sessionHistory.map((entry) => {
                  const opt = SPECIALIZATION_OPTIONS.find(o => o.value === entry.specialization);
                  return (
                    <button
                      key={entry.id}
                      onClick={() => {
                        setIdea(entry.idea);
                        setSpecialization(entry.specialization);
                        setResult(entry.result);
                        setSavedPromptId(null);
                        setSaveError(null);
                        setAnalyzeDone(false);
                        setShowHistory(false);
                      }}
                      className="w-full text-left rounded-md border border-border bg-card hover:border-primary/50 px-2.5 py-2 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground truncate flex-1">{entry.idea.slice(0, 60)}{entry.idea.length > 60 ? '...' : ''}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {entry.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{opt?.label ?? entry.specialization}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">Clique para restaurar uma geração anterior.</p>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
          )}

          {/* Result */}
          {result && (
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">Especialista: {result.applied_specialist}</span>
                <div className="flex gap-1 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={handleCopyMarkdown}>
                    {copied ? <><Check className="h-3.5 w-3.5 mr-1" /> Copiado!</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</>}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleExportMd}>
                    <Download className="h-3.5 w-3.5 mr-1" /> .md
                  </Button>
                  {!savedPromptId && (
                    <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                      {saving
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Salvando...</>
                        : <><Save className="h-3.5 w-3.5 mr-1" /> Salvar no Vault</>}
                    </Button>
                  )}
                  {!savedTemplateId ? (
                    <Button variant="ghost" size="sm" onClick={handleSaveAsTemplate} disabled={savingTemplate}>
                      {savingTemplate
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Salvando...</>
                        : <><LayoutTemplate className="h-3.5 w-3.5 mr-1" /> Template</>}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-green-400" onClick={() => router.push('/dashboard/templates')}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Template salvo
                    </Button>
                  )}
                </div>
              </div>

              {/* Feedback */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Este prompt foi útil?</span>
                <button
                  onClick={() => handleFeedback(true)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${feedback === 'useful' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-border text-muted-foreground hover:border-green-500/50 hover:text-green-400'}`}
                >
                  <ThumbsUp className="h-3 w-3" /> Útil
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${feedback === 'not_useful' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-border text-muted-foreground hover:border-red-500/50 hover:text-red-400'}`}
                >
                  <ThumbsDown className="h-3 w-3" /> Não útil
                </button>
              </div>

              {result.reasoning && (
                <p className="text-xs text-muted-foreground italic">{result.reasoning}</p>
              )}

              {/* Save feedback */}
              {saveError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">{saveError}</div>
              )}
              {savedPromptId && (
                <div className="rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-xs text-green-400 font-medium">Salvo no Vault</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-green-400 hover:text-green-300 px-2"
                      onClick={() => router.push(`/dashboard/prompts/${savedPromptId}`)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> Ver prompt
                    </Button>
                  </div>
                  {analyzing && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Analisando em background...
                    </div>
                  )}
                  {analyzeDone && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3 text-purple-400" /> Insights gerados
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-purple-400 hover:text-purple-300 px-2"
                        onClick={() => router.push('/dashboard/mentor')}
                      >
                        <Brain className="h-3 w-3 mr-1" /> Ver no Mentor
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <pre className="p-3 bg-muted border rounded-md text-xs text-foreground font-mono whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
                {result.markdown_prompt}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
