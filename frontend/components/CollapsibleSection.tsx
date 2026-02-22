'use client';

import { useState, ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 border border-gray-200 rounded-lg bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <span className="font-semibold text-gray-900 flex items-center gap-2">
          {typeof title === 'string' ? title : title}
        </span>
        <span className="text-gray-500 text-xl">
          {isOpen ? '▼' : '▸'}
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}
