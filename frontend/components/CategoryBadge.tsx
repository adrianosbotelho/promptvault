'use client';

interface CategoryBadgeProps {
  category: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  if (!category) {
    return null;
  }

  const getCategoryConfig = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'delphi':
        return {
          label: 'Delphi',
          bgColor: 'bg-[#3274d9]/20',
          textColor: 'text-[#3274d9]',
        };
      case 'oracle':
        return {
          label: 'Oracle',
          bgColor: 'bg-red-500/20',
          textColor: 'text-red-400',
        };
      case 'arquitetura':
        return {
          label: 'Architecture',
          bgColor: 'bg-purple-500/20',
          textColor: 'text-purple-400',
        };
      default:
        return {
          label: cat,
          bgColor: 'bg-[#2c2c34]',
          textColor: 'text-[#8c8c8c]',
        };
    }
  };

  const config = getCategoryConfig(category);
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center rounded ${config.bgColor} ${config.textColor} ${sizeClasses[size]} font-medium`}
    >
      {config.label}
    </span>
  );
}
