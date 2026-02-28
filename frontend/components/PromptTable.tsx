'use client';

import { PromptListItem, SemanticSearchResult } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CategoryBadge from './CategoryBadge';
import Link from 'next/link';
import { Edit2, Trash2, Sparkles } from 'lucide-react';

interface PromptTableProps {
  prompts: PromptListItem[];
  searchResults?: SemanticSearchResult[];
  onEdit?: (prompt: PromptListItem) => void;
  onDelete?: (prompt: PromptListItem) => void;
  onImprove?: (id: number) => void;
  improvingIds?: Set<number>;
}

export default function PromptTable({ prompts, searchResults, onEdit, onDelete, onImprove, improvingIds = new Set() }: PromptTableProps) {
  const getSimilarity = (promptId: number) => searchResults?.find(r => r.prompt.id === promptId)?.similarity;

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Updated</TableHead>
            {searchResults && <TableHead>Match</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prompts.map((prompt) => {
            const sim = getSimilarity(prompt.id);
            return (
              <TableRow key={prompt.id}>
                <TableCell>
                  <Link href={`/dashboard/prompts/${prompt.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                    {prompt.name}
                  </Link>
                  {prompt.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{prompt.description}</p>
                  )}
                </TableCell>
                <TableCell>
                  {prompt.category ? <CategoryBadge category={prompt.category} size="sm" /> : <span className="text-muted-foreground text-xs">--</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">v{prompt.latest_version || 1}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(prompt.updated_at).toLocaleDateString()}</TableCell>
                {searchResults && (
                  <TableCell>
                    {sim !== undefined && <Badge variant="blue" className="text-[10px]">{(sim * 100).toFixed(0)}%</Badge>}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(prompt)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(prompt)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onImprove && (
                      <Button size="sm" className="h-7" onClick={() => onImprove(prompt.id)} disabled={improvingIds.has(prompt.id)}>
                        <Sparkles className="h-3 w-3 mr-1" />
                        {improvingIds.has(prompt.id) ? '...' : 'Improve'}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
