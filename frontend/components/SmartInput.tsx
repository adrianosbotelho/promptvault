'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient, ContextAnalyzeResponse } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartInputRef {
  getValue: () => string;
  getContext: () => ContextAnalyzeResponse | null;
  clear: () => void;
}

interface SmartInputProps {
  onContextDetected?: (context: ContextAnalyzeResponse) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<SmartInputRef | null>;
  label?: string;
  defaultExpanded?: boolean;
}

export default function SmartInput({
  onContextDetected,
  placeholder = 'Type or paste code/description...',
  className = '',
  inputRef,
  label = 'Smart Input',
  defaultExpanded = false,
}: SmartInputProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [value, setValue] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [context, setContext] = useState<ContextAnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onContextDetectedRef = useRef(onContextDetected);

  useEffect(() => { onContextDetectedRef.current = onContextDetected; }, [onContextDetected]);

  useEffect(() => {
    if (inputRef) {
      (inputRef as any).current = {
        getValue: () => value,
        getContext: () => context,
        clear: () => { setValue(''); setContext(null); setError(null); },
      };
    }
  }, [value, context, inputRef]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!value.trim()) {
      setContext(null); setError(null);
      onContextDetectedRef.current?.({ detected_mode: 'unknown', confidence: 0, domain: 'unknown', subdomain: 'unknown', suggested_prompts: [], total_suggestions: 0 });
      return;
    }
    setAnalyzing(true); setError(null);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await apiClient.analyzeContext(value);
        setContext(result); setError(null);
        onContextDetectedRef.current?.(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze');
        setContext(null);
      } finally { setAnalyzing(false); }
    }, 800);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [value]);

  const MODE_MAP: Record<string, { label: string; variant: 'blue' | 'red' | 'purple' }> = {
    dev_delphi: { label: 'Delphi', variant: 'blue' },
    dev_oracle: { label: 'Oracle', variant: 'red' },
    architecture: { label: 'Architecture', variant: 'purple' },
  };
  const modeInfo = context ? MODE_MAP[context.detected_mode] : null;

  return (
    <div className={cn(
      "border-l-4 border-l-primary rounded-lg overflow-hidden bg-card shadow-[0_4px_14px_rgba(0,0,0,0.3),0_0_0_1px_rgba(47,129,247,0.15)]",
      className
    )}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-card hover:bg-accent transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> {label}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {!expanded && analyzing && (
            <span className="flex items-center gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Analyzing...</span>
          )}
          {!expanded && !analyzing && context && context.confidence > 0.3 && modeInfo && (
            <Badge variant={modeInfo.variant} className="text-[10px]">{modeInfo.label} {Math.round(context.confidence * 100)}%</Badge>
          )}
          {!expanded && !analyzing && !context && (
            <Badge variant="secondary" className="text-[10px]">Paste code or description</Badge>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-4 pt-0 border-t space-y-3">
          <div className="relative mt-3">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={8}
              className="font-mono pr-28"
            />
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {analyzing && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Analyzing...
                </span>
              )}
              {!analyzing && context && context.confidence > 0.3 && modeInfo && (
                <Badge variant={modeInfo.variant} className="text-xs">{modeInfo.label} {Math.round(context.confidence * 100)}%</Badge>
              )}
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {context && context.confidence > 0.3 && (
            <p className="text-xs text-muted-foreground">
              Detected: <span className="text-foreground">{context.domain}</span> / <span className="text-foreground">{context.subdomain}</span>
              {context.total_suggestions > 0 && <span className="ml-2">— {context.total_suggestions} prompt{context.total_suggestions !== 1 ? 's' : ''}</span>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
