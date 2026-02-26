'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient, ContextAnalyzeResponse } from '@/lib/api';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

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
  /** Label shown in the collapsed header (dropdown) */
  label?: string;
  /** Initial expanded state. Default false = always start collapsed */
  defaultExpanded?: boolean;
}

export default function SmartInput({
  onContextDetected,
  placeholder = '🔎 Digite ou cole código/descrição...',
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

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onContextDetectedRef.current = onContextDetected;
  }, [onContextDetected]);

  // Expose value and context via ref
  useEffect(() => {
    if (inputRef) {
      (inputRef as any).current = {
        getValue: () => value,
        getContext: () => context,
        clear: () => {
          setValue('');
          setContext(null);
          setError(null);
        },
      };
    }
  }, [value, context, inputRef]);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If value is empty, clear context
    if (!value.trim()) {
      setContext(null);
      setError(null);
      if (onContextDetectedRef.current) {
        onContextDetectedRef.current({
          detected_mode: 'unknown',
          confidence: 0,
          domain: 'unknown',
          subdomain: 'unknown',
          suggested_prompts: [],
          total_suggestions: 0,
        });
      }
      return;
    }

    // Set analyzing state
    setAnalyzing(true);
    setError(null);

    // Debounce: wait 800ms before analyzing
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await apiClient.analyzeContext(value);
        setContext(result);
        setError(null);
        
        if (onContextDetectedRef.current) {
          onContextDetectedRef.current(result);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to analyze context';
        setError(errorMessage);
        setContext(null);
        console.error('Context analysis error:', err);
      } finally {
        setAnalyzing(false);
      }
    }, 800);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value]); // Removed onContextDetected from dependencies

  const getModeDisplay = () => {
    if (!context) return null;
    
    const modeMap: Record<string, { label: string; color: string }> = {
      'dev_delphi': { label: 'Delphi', color: 'text-[#3274d9]' },
      'dev_oracle': { label: 'Oracle', color: 'text-red-400' },
      'architecture': { label: 'Architecture', color: 'text-purple-400' },
    };
    
    const mode = modeMap[context.detected_mode] || { label: context.detected_mode, color: 'text-[#8c8c8c]' };
    return mode;
  };

  const modeDisplay = getModeDisplay();

  return (
    <div className={`relative border border-[#2c2c34] rounded-lg overflow-hidden ${className}`}>
      {/* Dropdown header – always visible, toggles expanded */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-[#1f1f23] hover:bg-[#2c2c34] transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-white">
          <Sparkles className="w-4 h-4 text-[#3274d9]" />
          {label}
        </span>
        <span className="flex items-center gap-2 text-[#8c8c8c]">
          {!expanded && analyzing && (
            <span className="flex items-center gap-1 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing...
            </span>
          )}
          {!expanded && !analyzing && context && context.confidence > 0.3 && modeDisplay && (
            <span className={`text-xs font-medium ${modeDisplay.color}`}>
              {modeDisplay.label} ({Math.round(context.confidence * 100)}%)
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0" />
          )}
        </span>
      </button>

      {/* Conteúdo expansível */}
      {expanded && (
        <div className="p-4 pt-0 border-t border-[#2c2c34]">
          <div className="relative mt-3">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={8}
              className={`w-full px-4 py-3 bg-[#0b0b0f] border rounded text-sm text-white placeholder-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-[#3274d9] focus:border-[#3274d9] resize-y font-mono ${
                context && context.confidence > 0.3
                  ? `border-${context.detected_mode === 'dev_delphi' ? '[#3274d9]' : context.detected_mode === 'dev_oracle' ? 'red-500' : 'purple-500'}/50`
                  : 'border-[#2c2c34]'
              } transition-all`}
            />

            {/* Status indicator (when expanded) */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {analyzing && (
                <div className="flex items-center gap-1.5 text-xs text-[#8c8c8c]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </div>
              )}

              {!analyzing && context && context.confidence > 0.3 && modeDisplay && (
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded bg-[#1f1f23] border border-[#2c2c34] ${modeDisplay.color}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{modeDisplay.label}</span>
                  <span className="text-xs opacity-70">({Math.round(context.confidence * 100)}%)</span>
                </div>
              )}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Context info */}
          {context && context.confidence > 0.3 && (
            <div className="mt-2 text-xs text-[#8c8c8c]">
              Detected: <span className="text-white">{context.domain}</span> / <span className="text-white">{context.subdomain}</span>
              {context.total_suggestions > 0 && (
                <span className="ml-2">
                  • {context.total_suggestions} prompt{context.total_suggestions !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
