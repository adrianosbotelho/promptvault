'use client';

import { Badge } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'default';
}

const CATEGORY_VARIANTS: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
  delphi: 'blue',
  oracle: 'red',
  arquitetura: 'purple',
};

export default function CategoryBadge({ category, size = 'default' }: CategoryBadgeProps) {
  const variant = CATEGORY_VARIANTS[category.toLowerCase()] ?? 'secondary';
  return (
    <Badge variant={variant} className={size === 'sm' ? 'text-[10px] px-1.5 py-0' : ''}>
      {category}
    </Badge>
  );
}
