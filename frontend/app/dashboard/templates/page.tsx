'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { apiClient, PromptTemplate } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutTemplate, Trash2, Play, Copy, Check, ChevronDown, ChevronUp,
  Loader2, X, Plus,
} from 'lucide-react';

function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

// Modal to fill in template variables
function UseTemplateModal({
  template,
  onClose,
  onResult,
}: {
  template: PromptTemplate;
  onClose: () => void;
  onResult: (content: string) => void;
}) {
  const vars = template.variables ?? [];
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(vars.map(v => [v, '']))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUse = async () => {
    try {
      setLoading(true); setError(null);
      const res = await apiClient.useTemplate(template.id, values);
      onResult(res.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao instanciar template');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card border rounded-lg w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-sm font-semibold">Usar Template: {template.name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {vars.length === 0 ? (
            <p className="text-xs text-muted-foreground">Este template não tem variáveis. O conteúdo será copiado diretamente.</p>
          ) : (
            vars.map(v => (
              <div key={v} className="space-y-1">
                <label className="text-xs font-medium text-foreground">{`{{${v}}}`}</label>
                <input
                  type="text"
                  value={values[v] ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [v]: e.target.value }))}
                  placeholder={`Valor para ${v}...`}
                  className="w-full h-8 rounded-md border border-input bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            ))
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleUse} disabled={loading}>
            {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Gerando...</> : <><Play className="h-3.5 w-3.5 mr-1" /> Usar Template</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Result modal after using a template
function ResultModal({ content, onClose }: { content: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card border rounded-lg w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-sm font-semibold">Prompt Gerado</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <><Check className="h-3.5 w-3.5 mr-1" /> Copiado!</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</>}
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <pre className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">{content}</pre>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onDelete,
  onUse,
}: {
  template: PromptTemplate;
  onDelete: (id: number) => void;
  onUse: (t: PromptTemplate) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const vars = template.variables ?? [];

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <LayoutTemplate className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground truncate">{template.name}</span>
              {template.specialization && <Badge variant="blue" className="text-[10px]">{template.specialization}</Badge>}
              {template.category && <Badge variant="secondary" className="text-[10px]">{template.category}</Badge>}
            </div>
            {template.description && <p className="text-xs text-muted-foreground mb-2">{template.description}</p>}
            {vars.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {vars.map(v => (
                  <span key={v} className="text-[10px] bg-muted border rounded px-1.5 py-0.5 text-muted-foreground font-mono">{`{{${v}}}`}</span>
                ))}
              </div>
            )}
            <span className="text-[10px] text-muted-foreground">{formatDate(template.created_at)}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setExpanded(p => !p)}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" className="h-7 px-2" onClick={() => onUse(template)}>
              <Play className="h-3.5 w-3.5 mr-1" /> Usar
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => onDelete(template.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="mt-3 border-t pt-3">
            <pre className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed bg-muted rounded p-3 max-h-48 overflow-y-auto">{template.content}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingTemplate, setUsingTemplate] = useState<PromptTemplate | null>(null);
  const [resultContent, setResultContent] = useState<string | null>(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true); setError(null);
      setTemplates(await apiClient.getTemplates());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar templates');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir template');
    }
  };

  const handleResult = (content: string) => {
    setUsingTemplate(null);
    setResultContent(content);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
              <LayoutTemplate className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Templates</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prompts reutilizáveis com variáveis substituíveis. Salve um prompt do Studio como template para reutilizá-lo com contextos diferentes.
              </p>
            </div>
          </CardContent>
        </Card>

        {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando templates...</div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center space-y-3">
              <LayoutTemplate className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum template salvo ainda.</p>
              <p className="text-xs text-muted-foreground">
                Gere um prompt no <strong>Prompt Studio</strong> e clique em <strong>&ldquo;Salvar como Template&rdquo;</strong> para criar seu primeiro template.
              </p>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/studio'}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Ir para o Prompt Studio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <TemplateCard key={t.id} template={t} onDelete={handleDelete} onUse={setUsingTemplate} />
            ))}
          </div>
        )}
      </div>

      {usingTemplate && (
        <UseTemplateModal
          template={usingTemplate}
          onClose={() => setUsingTemplate(null)}
          onResult={handleResult}
        />
      )}
      {resultContent && (
        <ResultModal content={resultContent} onClose={() => setResultContent(null)} />
      )}
    </AppShell>
  );
}
