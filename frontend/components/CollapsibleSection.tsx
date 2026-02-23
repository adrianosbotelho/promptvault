'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 border border-[#2c2c34] rounded bg-[#1f1f23]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#2c2c34] transition-colors rounded-t"
      >
        <span className="font-semibold text-white text-sm flex items-center gap-2">
          {typeof title === 'string' ? title : title}
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-[#8c8c8c]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#8c8c8c]" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-[#2c2c34]">
          {children}
        </div>
      )}
    </div>
  );
}
