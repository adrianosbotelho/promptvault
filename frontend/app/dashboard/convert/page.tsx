'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiClient, ConvertResult, UrlConvertResult, YoutubeConvertResult } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  FileUp, Loader2, CheckCircle2, XCircle, Copy, Globe,
  Sparkles, Save, RotateCcw, Download, Youtube,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NewPromptForm from '@/components/NewPromptForm';

const ACCEPTED = '.pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.html,.htm,.csv,.json,.xml,.txt,.md';

const FORMAT_COLORS: Record<string, string> = {
  'PDF':                 'bg-red-500/10 text-red-400 border-red-500/30',
  'Word':                'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'Word (legado)':       'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'PowerPoint':          'bg-orange-500/10 text-orange-400 border-orange-500/30',
  'PowerPoint (legado)': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  'Excel':               'bg-green-500/10 text-green-400 border-green-500/30',
  'Excel (legado)':      'bg-green-500/10 text-green-400 border-green-500/30',
  'HTML':                'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'CSV':                 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'JSON':                'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  'XML':                 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  'Texto':               'bg-secondary text-muted-foreground border-border',
  'Markdown':            'bg-primary/10 text-primary border-primary/30',
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type ResultState = {
  markdown: string;
  label: string;
  sublabel?: string;
  format?: string;
  charCount: number;
};

function ResultPanel({
  result,
  editedMarkdown,
  setEditedMarkdown,
  onReset,
  onSave,
  showSaveForm,
  setShowSaveForm,
  router,
}: {
  result: ResultState;
  editedMarkdown: string;
  setEditedMarkdown: (v: string) => void;
  onReset: () => void;
  onSave: () => void;
  showSaveForm: boolean;
  setShowSaveForm: (v: boolean) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([editedMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenStudio = () => {
    const params = new URLSearchParams({ idea: editedMarkdown.slice(0, 500) });
    router.push(`/dashboard/studio?${params.toString()}`);
  };

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        {result.format && (
          <div className={cn(
            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium',
            FORMAT_COLORS[result.format] ?? 'bg-muted text-muted-foreground border-border'
          )}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {result.format}
          </div>
        )}
        <span className="text-xs text-muted-foreground truncate max-w-xs">{result.label}</span>
        {result.sublabel && <span className="text-xs text-muted-foreground">{result.sublabel}</span>}
        <span className="text-xs text-muted-foreground ml-auto">
          {result.charCount.toLocaleString('pt-BR')} caracteres
        </span>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Novo
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Markdown gerado</CardTitle>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5 mr-1" /> Baixar .md
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Textarea
            value={editedMarkdown}
            onChange={e => setEditedMarkdown(e.target.value)}
            rows={20}
            className="font-mono text-xs resize-y"
            placeholder="Conteúdo convertido aparecerá aqui..."
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Você pode editar o conteúdo antes de salvar.
          </p>
        </CardContent>
      </Card>

      {!showSaveForm && (
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowSaveForm(true)} disabled={!editedMarkdown.trim()}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar como Prompt
          </Button>
          <Button variant="secondary" onClick={handleOpenStudio} disabled={!editedMarkdown.trim()}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Abrir no Studio
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar .md
          </Button>
        </div>
      )}

      {showSaveForm && (
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <NewPromptForm
              initialContent={editedMarkdown}
              onSuccess={() => {
                setShowSaveForm(false);
                router.push('/dashboard');
              }}
              onCancel={() => setShowSaveForm(false)}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default function ConvertPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'youtube'>('file');

  // Shared result state
  const [result, setResult] = useState<ResultState | null>(null);
  const [editedMarkdown, setEditedMarkdown] = useState('');
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);

  // File tab
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // URL tab
  const [urlInput, setUrlInput] = useState('');

  // YouTube tab
  const [ytInput, setYtInput] = useState('');
  const [ytTimestamps, setYtTimestamps] = useState(false);

  const resetResult = () => {
    setResult(null);
    setEditedMarkdown('');
    setError(null);
    setShowSaveForm(false);
    setSelectedFile(null);
  };

  // ── File conversion ──────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    resetResult();
    setSelectedFile(file);
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Limite: 10 MB.');
      return;
    }
    try {
      setConverting(true);
      const res = await apiClient.convertFile(file);
      const state: ResultState = {
        markdown: res.markdown,
        label: res.filename,
        sublabel: formatBytes(file.size),
        format: res.detected_format,
        charCount: res.char_count,
      };
      setResult(state);
      setEditedMarkdown(res.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao converter o arquivo');
    } finally {
      setConverting(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  // ── URL conversion ───────────────────────────────────────────────────────
  const handleConvertUrl = async () => {
    if (!urlInput.trim()) return;
    resetResult();
    try {
      setConverting(true);
      const res = await apiClient.convertUrl(urlInput.trim());
      const state: ResultState = {
        markdown: res.markdown,
        label: res.title || res.url,
        sublabel: res.url !== (res.title || res.url) ? res.url : undefined,
        format: 'HTML',
        charCount: res.char_count,
      };
      setResult(state);
      setEditedMarkdown(res.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao converter a URL');
    } finally {
      setConverting(false);
    }
  };

  // ── YouTube conversion ───────────────────────────────────────────────────
  const handleConvertYoutube = async () => {
    if (!ytInput.trim()) return;
    resetResult();
    try {
      setConverting(true);
      const res = await apiClient.convertYoutube(ytInput.trim(), ytTimestamps);
      const state: ResultState = {
        markdown: res.markdown,
        label: `YouTube: ${res.video_id}`,
        sublabel: res.url,
        charCount: res.char_count,
      };
      setResult(state);
      setEditedMarkdown(res.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao obter transcrição');
    } finally {
      setConverting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Converter para Markdown
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Converta arquivos, páginas web e vídeos do YouTube em Markdown pronto para usar nos seus prompts.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={v => { setActiveTab(v as typeof activeTab); resetResult(); }}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="file" className="flex items-center gap-1.5">
              <FileUp className="h-3.5 w-3.5" /> Arquivo
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> URL
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex items-center gap-1.5">
              <Youtube className="h-3.5 w-3.5" /> YouTube
            </TabsTrigger>
          </TabsList>

          {/* ── FILE TAB ── */}
          <TabsContent value="file" className="space-y-4 mt-4">
            {!result && !converting && (
              <>
                <Card
                  className={cn(
                    'border-2 border-dashed transition-colors cursor-pointer',
                    dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  )}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                >
                  <CardContent className="py-16 flex flex-col items-center gap-4 text-center select-none">
                    <div className={cn('p-4 rounded-full transition-colors', dragging ? 'bg-primary/20' : 'bg-muted')}>
                      <FileUp className={cn('h-8 w-8', dragging ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {dragging ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF · Word · Excel · PowerPoint · HTML · CSV · JSON · XML · TXT
                      </p>
                      <p className="text-xs text-muted-foreground">Máximo 10 MB</p>
                    </div>
                    <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={onInputChange} />
                  </CardContent>
                </Card>

                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-primary mb-3">Formatos suportados</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'PDF', color: 'bg-red-500/10 text-red-400' },
                        { label: 'Word (.docx)', color: 'bg-blue-500/10 text-blue-400' },
                        { label: 'PowerPoint (.pptx)', color: 'bg-orange-500/10 text-orange-400' },
                        { label: 'Excel (.xlsx)', color: 'bg-green-500/10 text-green-400' },
                        { label: 'HTML', color: 'bg-purple-500/10 text-purple-400' },
                        { label: 'CSV', color: 'bg-cyan-500/10 text-cyan-400' },
                        { label: 'JSON', color: 'bg-yellow-500/10 text-yellow-400' },
                        { label: 'XML', color: 'bg-pink-500/10 text-pink-400' },
                        { label: 'TXT / MD', color: 'bg-muted text-muted-foreground' },
                      ].map(f => (
                        <span key={f.label} className={`text-[11px] px-2 py-1 rounded-md font-medium ${f.color}`}>
                          {f.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-3">
                      Powered by{' '}
                      <a href="https://github.com/microsoft/markitdown" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        microsoft/markitdown
                      </a>
                      {' '}— MIT License
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── URL TAB ── */}
          <TabsContent value="url" className="space-y-4 mt-4">
            {!result && !converting && (
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">URL da página</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Cole o endereço de uma documentação, artigo ou qualquer página web para extrair o conteúdo como Markdown.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://docs.exemplo.com/guia"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleConvertUrl()}
                        className="flex-1"
                      />
                      <Button onClick={handleConvertUrl} disabled={!urlInput.trim()}>
                        <Globe className="h-3.5 w-3.5 mr-1.5" /> Converter
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Exemplos de uso:</p>
                    <p>• Documentação de bibliotecas (React, FastAPI, etc.)</p>
                    <p>• Artigos técnicos e posts de blog</p>
                    <p>• Wikis e páginas de referência</p>
                    <p>• Páginas de changelog ou release notes</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── YOUTUBE TAB ── */}
          <TabsContent value="youtube" className="space-y-4 mt-4">
            {!result && !converting && (
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Link do YouTube</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Extraia a transcrição de um vídeo do YouTube como Markdown estruturado. Funciona com legendas automáticas e manuais.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={ytInput}
                        onChange={e => setYtInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleConvertYoutube()}
                        className="flex-1"
                      />
                      <Button onClick={handleConvertYoutube} disabled={!ytInput.trim()}>
                        <Youtube className="h-3.5 w-3.5 mr-1.5" /> Extrair
                      </Button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={ytTimestamps}
                      onChange={e => setYtTimestamps(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs text-muted-foreground">Incluir timestamps na transcrição</span>
                  </label>
                  <div className="rounded-md bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Exemplos de uso:</p>
                    <p>• Aulas e tutoriais técnicos</p>
                    <p>• Palestras e apresentações de conferências</p>
                    <p>• Podcasts com vídeo</p>
                    <p>• Demos e walkthroughs de ferramentas</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Powered by{' '}
                    <a href="https://github.com/jdepoix/youtube-transcript-api" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      youtube-transcript-api
                    </a>
                    {' '}— MIT License · Sem API key necessária
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Converting spinner */}
        {converting && (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Convertendo...</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Falha na conversão</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && !converting && (
          <ResultPanel
            result={result}
            editedMarkdown={editedMarkdown}
            setEditedMarkdown={setEditedMarkdown}
            onReset={resetResult}
            onSave={() => setShowSaveForm(true)}
            showSaveForm={showSaveForm}
            setShowSaveForm={setShowSaveForm}
            router={router}
          />
        )}
      </div>
    </AppShell>
  );
}
