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
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-300',
        };
      case 'oracle':
        return {
          label: 'Oracle',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          borderColor: 'border-red-300',
        };
      case 'arquitetura':
        return {
          label: 'Architecture',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-300',
        };
      default:
        return {
          label: cat,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-300',
        };
    }
  };

  const config = getCategoryConfig(category);
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]} font-medium`}
    >
      {config.label}
    </span>
  );
}
