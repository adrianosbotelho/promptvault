'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PromptStudio from '@/components/PromptStudio';

function StudioContent() {
  const searchParams = useSearchParams();
  const idea = searchParams.get('idea') ?? undefined;
  const spec = searchParams.get('spec') ?? undefined;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <PromptStudio initialIdea={idea} initialSpec={spec} forceOpen={true} />
      </div>
    </AppShell>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<AppShell><div className="max-w-2xl mx-auto text-muted-foreground text-sm text-center py-12">Carregando...</div></AppShell>}>
      <StudioContent />
    </Suspense>
  );
}
