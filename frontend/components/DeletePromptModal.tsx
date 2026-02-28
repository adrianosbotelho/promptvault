'use client';

import { useState } from 'react';
import { PromptListItem } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DeletePromptModalProps {
  prompt: PromptListItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeletePromptModal({ prompt, isOpen, onClose, onSuccess }: DeletePromptModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== prompt.name) {
      setError('Name does not match. Type the exact prompt name to confirm.');
      return;
    }
    setError(null); setLoading(true);
    try {
      const { apiClient } = await import('@/lib/api');
      await apiClient.deletePrompt(prompt.id);
      onSuccess(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete prompt'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Prompt</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong className="text-foreground">"{prompt.name}"</strong>?
            This action cannot be undone. All versions will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Type the prompt name to confirm:</label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={prompt.name}
              className="focus-visible:ring-destructive"
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading || confirmText !== prompt.name}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
