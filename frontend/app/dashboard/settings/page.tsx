'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { apiClient, IntegrationConfig, IntegrationConfigCreate } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Github, Webhook, MessageSquare, BookOpen, Plus, Trash2,
  CheckCircle2, XCircle, Loader2, ExternalLink, TestTube2, Save,
} from 'lucide-react';

type Tab = 'github' | 'webhooks' | 'slack' | 'discord' | 'notion';

const TAB_CONFIG: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'github',    label: 'GitHub',         icon: Github,        description: 'Exporte prompts como arquivos .md para um repositório GitHub' },
  { id: 'webhooks',  label: 'Webhooks',        icon: Webhook,       description: 'Dispare eventos para n8n, Make.com, Zapier ou qualquer URL' },
  { id: 'slack',     label: 'Slack',           icon: MessageSquare, description: 'Receba notificações de eventos no Slack' },
  { id: 'discord',   label: 'Discord',         icon: MessageSquare, description: 'Receba notificações de eventos no Discord' },
  { id: 'notion',    label: 'Notion',          icon: BookOpen,      description: 'Exporte prompts como páginas em um database do Notion' },
];

const ALL_EVENTS = ['prompt.created', 'prompt.improved', 'insight.generated'];

function StatusBadge({ enabled }: { enabled: boolean }) {
  return enabled
    ? <Badge variant="green" className="text-[10px]">Ativo</Badge>
    : <Badge variant="secondary" className="text-[10px]">Inativo</Badge>;
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── GitHub Form ───────────────────────────────────────────────────────────────
function GitHubForm({ existing, onSaved }: { existing?: IntegrationConfig; onSaved: () => void }) {
  const [token, setToken] = useState(existing?.config.token ?? '');
  const [owner, setOwner] = useState(existing?.config.owner ?? '');
  const [repo, setRepo]   = useState(existing?.config.repo ?? '');
  const [folder, setFolder] = useState(existing?.config.folder ?? 'prompts');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleValidate = async () => {
    if (!token || !owner || !repo) { setMsg({ ok: false, text: 'Preencha token, owner e repo' }); return; }
    setValidating(true); setMsg(null);
    const res = await apiClient.githubValidate(token, owner, repo);
    setMsg({ ok: res.success, text: res.message });
    setValidating(false);
  };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    const data: IntegrationConfigCreate = {
      integration_type: 'github',
      name: `${owner}/${repo}`,
      config: { token, owner, repo, folder },
      enabled: true,
    };
    if (existing) await apiClient.updateIntegration(existing.id, data);
    else await apiClient.createIntegration(data);
    setMsg({ ok: true, text: 'Configuração salva!' });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="space-y-4">
      <FieldRow label="Personal Access Token" hint="Precisa da permissão Contents (read & write) no repositório">
        <Input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="ghp_..." />
      </FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Owner (usuário ou org)">
          <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="seu-usuario" />
        </FieldRow>
        <FieldRow label="Repositório">
          <Input value={repo} onChange={e => setRepo(e.target.value)} placeholder="meu-repo" />
        </FieldRow>
      </div>
      <FieldRow label="Pasta no repositório" hint="Onde os arquivos .md serão criados">
        <Input value={folder} onChange={e => setFolder(e.target.value)} placeholder="prompts" />
      </FieldRow>
      {msg && (
        <div className={`flex items-center gap-2 text-xs rounded-md px-3 py-2 ${msg.ok ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
          {msg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {msg.text}
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleValidate} disabled={validating}>
          {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <TestTube2 className="h-3.5 w-3.5 mr-1" />}
          Testar conexão
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

// ── Webhook / Slack / Discord Form ────────────────────────────────────────────
function WebhookForm({ type, existing, onSaved, onDelete }: {
  type: 'webhook' | 'slack' | 'discord';
  existing?: IntegrationConfig;
  onSaved: () => void;
  onDelete?: () => void;
}) {
  const [url, setUrl] = useState(existing?.config.url ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [events, setEvents] = useState<string[]>(existing?.events ?? ALL_EVENTS);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggleEvent = (ev: string) =>
    setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);

  const handleSave = async () => {
    if (!url) { setMsg({ ok: false, text: 'URL obrigatória' }); return; }
    setSaving(true); setMsg(null);
    const data: IntegrationConfigCreate = {
      integration_type: type,
      name: name || url,
      config: { url },
      enabled: true,
      events,
    };
    if (existing) await apiClient.updateIntegration(existing.id, data);
    else await apiClient.createIntegration(data);
    setMsg({ ok: true, text: 'Configuração salva!' });
    setSaving(false);
    onSaved();
  };

  const handleTest = async () => {
    if (!existing) { setMsg({ ok: false, text: 'Salve primeiro para testar' }); return; }
    setTesting(true); setMsg(null);
    const res = await apiClient.webhookTest(existing.id);
    setMsg({ ok: res.success, text: res.message });
    setTesting(false);
  };

  const placeholder = type === 'slack'
    ? 'https://hooks.slack.com/services/...'
    : type === 'discord'
    ? 'https://discord.com/api/webhooks/...'
    : 'https://n8n.example.com/webhook/...';

  return (
    <div className="space-y-4">
      <FieldRow label="Nome (opcional)">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Meu webhook" />
      </FieldRow>
      <FieldRow label="URL do Webhook">
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder={placeholder} />
      </FieldRow>
      {type === 'webhook' && (
        <FieldRow label="Eventos" hint="Quais eventos disparam este webhook">
          <div className="flex flex-wrap gap-2 mt-1">
            {ALL_EVENTS.map(ev => (
              <button
                key={ev}
                onClick={() => toggleEvent(ev)}
                className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                  events.includes(ev)
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {ev}
              </button>
            ))}
          </div>
        </FieldRow>
      )}
      {msg && (
        <div className={`flex items-center gap-2 text-xs rounded-md px-3 py-2 ${msg.ok ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
          {msg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {msg.text}
        </div>
      )}
      <div className="flex gap-2">
        {existing && (
          <Button variant="secondary" size="sm" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <TestTube2 className="h-3.5 w-3.5 mr-1" />}
            Testar
          </Button>
        )}
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Salvar
        </Button>
        {onDelete && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive ml-auto" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Notion Form ───────────────────────────────────────────────────────────────
function NotionForm({ existing, onSaved }: { existing?: IntegrationConfig; onSaved: () => void }) {
  const [token, setToken] = useState(existing?.config.token ?? '');
  const [dbId, setDbId]   = useState(existing?.config.database_id ?? '');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleValidate = async () => {
    if (!token || !dbId) { setMsg({ ok: false, text: 'Preencha token e database ID' }); return; }
    setValidating(true); setMsg(null);
    const res = await apiClient.notionValidate(token, dbId);
    setMsg({ ok: res.success, text: res.message });
    setValidating(false);
  };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    const data: IntegrationConfigCreate = {
      integration_type: 'notion',
      name: 'Notion Database',
      config: { token, database_id: dbId },
      enabled: true,
    };
    if (existing) await apiClient.updateIntegration(existing.id, data);
    else await apiClient.createIntegration(data);
    setMsg({ ok: true, text: 'Configuração salva!' });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="space-y-4">
      <FieldRow
        label="Integration Token"
        hint="Crie uma integração em notion.so/my-integrations e copie o token"
      >
        <Input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="secret_..." />
      </FieldRow>
      <FieldRow
        label="Database ID"
        hint="Abra o database no Notion e copie o ID da URL (32 caracteres)"
      >
        <Input value={dbId} onChange={e => setDbId(e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
      </FieldRow>
      {msg && (
        <div className={`flex items-center gap-2 text-xs rounded-md px-3 py-2 ${msg.ok ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
          {msg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {msg.text}
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleValidate} disabled={validating}>
          {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <TestTube2 className="h-3.5 w-3.5 mr-1" />}
          Testar conexão
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('github');
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingWebhook, setAddingWebhook] = useState(false);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setConfigs(await apiClient.getIntegrations());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadConfigs(); }, []);

  const byType = (t: string) => configs.filter(c => c.integration_type === t);

  const handleDelete = async (id: number) => {
    await apiClient.deleteIntegration(id);
    loadConfigs();
  };

  const activeTabConfig = TAB_CONFIG.find(t => t.id === activeTab)!;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-foreground">Integrações</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Conecte o PromptVault a ferramentas externas para exportar prompts e receber notificações.
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <nav className="w-44 flex-shrink-0 space-y-0.5">
            {TAB_CONFIG.map(tab => {
              const Icon = tab.icon;
              const count = byType(tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-sidebar-accent text-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{tab.label}</span>
                  {count > 0 && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-4">
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <activeTabConfig.icon className="h-4 w-4 text-muted-foreground" />
                  {activeTabConfig.label}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{activeTabConfig.description}</p>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {loading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : (
                  <>
                    {/* GitHub */}
                    {activeTab === 'github' && (
                      <GitHubForm existing={byType('github')[0]} onSaved={loadConfigs} />
                    )}

                    {/* Notion */}
                    {activeTab === 'notion' && (
                      <NotionForm existing={byType('notion')[0]} onSaved={loadConfigs} />
                    )}

                    {/* Slack */}
                    {activeTab === 'slack' && (
                      <div className="space-y-4">
                        {byType('slack').map(cfg => (
                          <div key={cfg.id} className="border rounded-md p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-foreground">{cfg.name || cfg.config.url}</span>
                              <StatusBadge enabled={cfg.enabled} />
                            </div>
                            <WebhookForm
                              type="slack"
                              existing={cfg}
                              onSaved={loadConfigs}
                              onDelete={() => handleDelete(cfg.id)}
                            />
                          </div>
                        ))}
                        {byType('slack').length === 0 && (
                          <WebhookForm type="slack" onSaved={loadConfigs} />
                        )}
                      </div>
                    )}

                    {/* Discord */}
                    {activeTab === 'discord' && (
                      <div className="space-y-4">
                        {byType('discord').map(cfg => (
                          <div key={cfg.id} className="border rounded-md p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-foreground">{cfg.name || cfg.config.url}</span>
                              <StatusBadge enabled={cfg.enabled} />
                            </div>
                            <WebhookForm
                              type="discord"
                              existing={cfg}
                              onSaved={loadConfigs}
                              onDelete={() => handleDelete(cfg.id)}
                            />
                          </div>
                        ))}
                        {byType('discord').length === 0 && (
                          <WebhookForm type="discord" onSaved={loadConfigs} />
                        )}
                      </div>
                    )}

                    {/* Generic Webhooks */}
                    {activeTab === 'webhooks' && (
                      <div className="space-y-4">
                        {byType('webhook').map(cfg => (
                          <div key={cfg.id} className="border rounded-md p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-foreground">{cfg.name || cfg.config.url}</span>
                              <div className="flex items-center gap-2">
                                {cfg.events?.map(ev => (
                                  <span key={ev} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{ev}</span>
                                ))}
                                <StatusBadge enabled={cfg.enabled} />
                              </div>
                            </div>
                            <WebhookForm
                              type="webhook"
                              existing={cfg}
                              onSaved={() => { loadConfigs(); setAddingWebhook(false); }}
                              onDelete={() => handleDelete(cfg.id)}
                            />
                          </div>
                        ))}

                        {addingWebhook && (
                          <div className="border border-primary/30 rounded-md p-4">
                            <p className="text-xs font-medium text-foreground mb-3">Novo Webhook</p>
                            <WebhookForm
                              type="webhook"
                              onSaved={() => { loadConfigs(); setAddingWebhook(false); }}
                              onDelete={() => setAddingWebhook(false)}
                            />
                          </div>
                        )}

                        {!addingWebhook && (
                          <Button variant="secondary" size="sm" onClick={() => setAddingWebhook(true)}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Webhook
                          </Button>
                        )}

                        {byType('webhook').length === 0 && !addingWebhook && (
                          <div className="text-center py-6 space-y-2">
                            <Webhook className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                            <p className="text-xs text-muted-foreground">
                              Nenhum webhook configurado. Adicione uma URL do n8n, Make.com ou Zapier.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Help card */}
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-primary mb-2">Como usar</p>
                {activeTab === 'github' && (
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Gere um token em <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">github.com/settings/tokens <ExternalLink className="h-2.5 w-2.5" /></a></li>
                    <li>Selecione a permissão <strong>Contents</strong> (read & write)</li>
                    <li>Após salvar, use o botão "Exportar para GitHub" em qualquer prompt</li>
                  </ul>
                )}
                {activeTab === 'webhooks' && (
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>No n8n: crie um nó Webhook e copie a URL de produção</li>
                    <li>No Make.com: crie um módulo Custom Webhook e copie a URL</li>
                    <li>O payload enviado é: <code className="bg-muted px-1 rounded">{"{ event, data: { name, category, ... } }"}</code></li>
                  </ul>
                )}
                {activeTab === 'slack' && (
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Crie um app em <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">api.slack.com/apps <ExternalLink className="h-2.5 w-2.5" /></a></li>
                    <li>Ative "Incoming Webhooks" e adicione ao workspace</li>
                    <li>Copie a URL gerada e cole acima</li>
                  </ul>
                )}
                {activeTab === 'discord' && (
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>No Discord: Configurações do servidor → Integrações → Webhooks</li>
                    <li>Crie um webhook, selecione o canal e copie a URL</li>
                    <li>Adicione <code className="bg-muted px-1 rounded">/slack</code> ao final da URL para compatibilidade</li>
                  </ul>
                )}
                {activeTab === 'notion' && (
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Crie uma integração em <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">notion.so/my-integrations <ExternalLink className="h-2.5 w-2.5" /></a></li>
                    <li>Conecte a integração ao database desejado (Share → Add connections)</li>
                    <li>O Database ID está na URL: notion.so/&lt;workspace&gt;/<strong>&lt;database-id&gt;</strong>?v=...</li>
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
