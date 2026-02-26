'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient, MentorSummaryResponse, MentorSummaryItem } from '@/lib/api';
import { Brain, Eye, AlertTriangle, Layers, RefreshCw, ExternalLink } from 'lucide-react';

function formatDate(createdAt: string | undefined): string {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays}d atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

function ItemList({
  items,
  emptyLabel,
  icon: Icon,
  iconColor,
}: {
  items: MentorSummaryItem[];
  emptyLabel: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-[#8c8c8c] italic">{emptyLabel}</p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-[#d8d9da]">
          <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
          <span className="flex-1 min-w-0">
            <span>{item.text}</span>
            {(item.prompt_id != null || item.created_at) && (
              <span className="text-[#8c8c8c] text-xs ml-1 block mt-1">
                {item.prompt_id != null && (
                  <Link
                    href={`/dashboard/prompts/${item.prompt_id}`}
                    className="inline-flex items-center gap-1 text-[#3274d9] hover:text-[#5a9aff] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {item.prompt_name ? `Prompt: ${item.prompt_name}` : `Prompt #${item.prompt_id}`}
                  </Link>
                )}
                {item.created_at && (
                  <span className={item.prompt_id != null ? ' ml-1' : ''}>
                    {item.prompt_id != null ? ' · ' : ''}{formatDate(item.created_at)}
                  </span>
                )}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ArchitectMentorPanel() {
  const [summary, setSummary] = useState<MentorSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await apiClient.getMentorSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar resumo do mentor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isEmpty =
    summary &&
    summary.recent_observations.length === 0 &&
    summary.architectural_alerts.length === 0 &&
    summary.detected_patterns.length === 0;

  return (
    <div className="bg-[#1f1f23] rounded-lg border border-[#2c2c34] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#2c2c34]">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/20 rounded-lg">
            <Brain className="w-4 h-4 text-amber-400" />
          </div>
          Architect Mentor
        </h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-1.5 text-[#8c8c8c] hover:text-[#d8d9da] hover:bg-[#2c2c34] rounded transition-colors disabled:opacity-50"
          title="Atualizar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading && !summary && (
          <p className="text-sm text-[#8c8c8c]">Carregando...</p>
        )}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        {!loading && summary && (
          <>
            <div>
              <h3 className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Eye className="w-3.5 h-3.5 text-[#3274d9]" />
                Observações recentes
              </h3>
              <ItemList
                items={summary.recent_observations}
                emptyLabel="Nenhuma observação ainda. Execute a análise de prompts para gerar."
                icon={Eye}
                iconColor="text-[#3274d9]"
              />
            </div>
            <div>
              <h3 className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Alertas arquiteturais
              </h3>
              <ItemList
                items={summary.architectural_alerts}
                emptyLabel="Nenhum alerta no momento."
                icon={AlertTriangle}
                iconColor="text-amber-400"
              />
            </div>
            <div>
              <h3 className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Padrões detectados
              </h3>
              <ItemList
                items={summary.detected_patterns}
                emptyLabel="Nenhum padrão detectado ainda. Execute a análise de prompts."
                icon={Layers}
                iconColor="text-purple-400"
              />
            </div>
            {isEmpty && (
              <p className="text-xs text-[#8c8c8c] pt-2 border-t border-[#2c2c34]">
                Use &quot;Analyze Prompts&quot; para o agente gerar observações, alertas e padrões a partir dos seus prompts.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
