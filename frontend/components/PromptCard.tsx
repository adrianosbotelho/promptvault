'use client';

import { useState } from 'react';
import { PromptListItem } from '@/lib/api';
import { apiClient } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CategoryBadge from './CategoryBadge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FileText, Edit2, Trash2, Sparkles, Clock, Tag, Star } from 'lucide-react';

interface PromptCardProps {
  prompt: PromptListItem;
  onEdit?: (prompt: PromptListItem) => void;
  onDelete?: (prompt: PromptListItem) => void;
  onImprove?: (id: number) => void;
  onFavoriteToggled?: (updated: PromptListItem) => void;
  improving?: boolean;
  similarity?: number;
}

const TAG_VARIANTS: Record<string, 'blue' | 'red' | 'purple' | 'green' | 'yellow' | 'cyan' | 'secondary'> = {
  implementation: 'blue',
  debug: 'red',
  architecture: 'purple',
  performance: 'green',
  analysis: 'yellow',
  improvement: 'cyan',
};

function QualityBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-green-500' :
    score >= 40 ? 'bg-yellow-500' :
    'bg-red-500';
  return (
    <div className="mt-2 space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Qualidade</span>
        <span className="text-[10px] text-muted-foreground">{score}%</span>
      </div>
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function PromptCard({
  prompt,
  onEdit,
  onDelete,
  onImprove,
  onFavoriteToggled,
  improving = false,
  similarity,
}: PromptCardProps) {
  const isImproved = !!prompt.provider;
  const [isFavorite, setIsFavorite] = useState(!!prompt.is_favorite);
  const [togglingFav, setTogglingFav] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (togglingFav) return;
    try {
      setTogglingFav(true);
      setIsFavorite(prev => !prev);
      const updated = await apiClient.toggleFavorite(prompt.id);
      setIsFavorite(!!updated.is_favorite);
      onFavoriteToggled?.(updated);
    } catch {
      setIsFavorite(!!prompt.is_favorite);
    } finally {
      setTogglingFav(false);
    }
  };

  const score = prompt.quality_score ?? 0;

  return (
    <Card
      className={cn(
        "group relative transition-all shadow-[0_2px_6px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)] hover:border-primary/50",
        isImproved && "border-primary/30",
        isFavorite && "border-yellow-500/40"
      )}
    >
      <CardContent className="p-4">
        {/* Top-right badges */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {isImproved && (
            <Badge variant="green" className="text-[10px] gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Improved
            </Badge>
          )}
          <button
            onClick={handleToggleFavorite}
            className={cn(
              "transition-colors",
              isFavorite ? "text-yellow-400 hover:text-yellow-300" : "text-muted-foreground hover:text-yellow-400 opacity-0 group-hover:opacity-100"
            )}
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-yellow-400")} />
          </button>
        </div>

        <Link href={`/dashboard/prompts/${prompt.id}`} className="block">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1.5 pr-16">
            <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
              {prompt.name}
            </h3>
          </div>

          {/* Category + similarity */}
          <div className="flex items-center gap-1.5 mb-2">
            {prompt.category && <CategoryBadge category={prompt.category} size="sm" />}
            {similarity !== undefined && (
              <Badge variant="blue" className="text-[10px]">{(similarity * 100).toFixed(0)}%</Badge>
            )}
          </div>

          {/* Description */}
          {prompt.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{prompt.description}</p>
          )}

          {/* Tags */}
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mb-2">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {prompt.tags.map((tag, idx) => (
                <Badge key={idx} variant={TAG_VARIANTS[tag.toLowerCase()] ?? 'secondary'} className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> v{prompt.latest_version || 1}
            </span>
            <span>{new Date(prompt.updated_at).toLocaleDateString()}</span>
            {prompt.provider && (
              <Badge variant="blue" className="text-[10px] px-1.5 py-0">
                {prompt.provider === 'MockLLMProvider' ? 'Mock'
                  : prompt.provider === 'GroqProvider' ? 'Groq'
                  : prompt.provider === 'OpenAIProvider' ? 'OpenAI'
                  : 'Improved'}
              </Badge>
            )}
          </div>

          {/* Quality bar */}
          <QualityBar score={score} />
        </Link>

        {/* Hover actions */}
        <div className="flex items-center gap-1.5 pt-3 mt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onEdit(prompt)}>
              <Edit2 className="h-3 w-3 mr-1" /> Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => onDelete(prompt)}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}
          {onImprove && (
            <Button size="sm" className="h-7 ml-auto" onClick={() => onImprove(prompt.id)} disabled={improving}>
              <Sparkles className="h-3 w-3 mr-1" />
              {improving ? 'Improving...' : 'Improve'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
