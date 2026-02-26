'use client';

import AppShell from '@/components/AppShell';
import ArchitectMentorPanel from '@/components/ArchitectMentorPanel';

export default function MentorPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-4">Architect Mentor</h1>
        <ArchitectMentorPanel />
      </div>
    </AppShell>
  );
}
