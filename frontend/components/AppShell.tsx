'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  FileText,
  Lightbulb,
  Bot,
  Brain,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  Search,
  X,
  User,
  LayoutTemplate,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  detectedContext?: {
    detected_mode: string;
    confidence: number;
  } | null;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/prompts', label: 'Prompts', icon: FileText },
  { href: '/dashboard/insights', label: 'Insights', icon: Lightbulb },
  { href: '/dashboard/mentor', label: 'Architect Mentor', icon: Brain },
  { href: '/dashboard/studio', label: 'Prompt Studio', icon: Sparkles },
  { href: '/dashboard/agent', label: 'Agent', icon: Bot },
];

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/prompts': 'Prompts',
  '/dashboard/insights': 'Insights',
  '/dashboard/mentor': 'Architect Mentor',
  '/dashboard/studio': 'Prompt Studio',
  '/dashboard/templates': 'Templates',
  '/dashboard/agent': 'Agent',
  '/dashboard/profile': 'Perfil do Arquiteto',
  '/dashboard/admin/worker': 'Settings',
};

export default function AppShell({ children, detectedContext }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Global search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; name: string; category?: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('pv-theme');
    const dark = stored !== 'light';
    setIsDark(dark);
    document.documentElement.classList.toggle('light', !dark);

    // Load unread insights count
    apiClient.getInsights({ unread_only: true }).then(items => setUnreadCount(items.length)).catch(() => {});
  }, []);

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [searchOpen]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await apiClient.searchPrompts(q);
        setSearchResults(res.map(r => ({ id: r.id, name: r.name, category: r.category })));
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('light', !nextDark);
    localStorage.setItem('pv-theme', nextDark ? 'dark' : 'light');
  };

  const handleLogout = () => { logout(); router.push('/login'); };
  const navigate = (href: string) => router.push(href);

  const isActive = (href: string) => {
    if (!mounted) return false;
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href) ?? false;
  };

  const pageTitle = mounted
    ? (pathname?.startsWith('/dashboard/prompts/') && pathname !== '/dashboard/prompts'
        ? 'Prompt Details'
        : ROUTE_TITLES[pathname ?? ''] ?? '')
    : '';

  if (!mounted) {
    return (
      <div className="flex h-screen bg-background text-foreground">
        <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col" />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen bg-background text-foreground">
        {/* Sidebar */}
        <aside
          className={cn(
            "bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 flex-shrink-0 overflow-hidden",
            sidebarOpen ? "w-60" : "w-0 lg:w-14"
          )}
        >
          {/* Logo */}
          <div className="h-14 px-4 border-b border-sidebar-border flex items-center justify-between flex-shrink-0">
            {sidebarOpen && (
              <span className="text-base font-bold text-foreground tracking-tight">PromptVault</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              const isInsights = item.href === '/dashboard/insights';

              const contextHighlight = detectedContext && detectedContext.confidence > 0.3 && (
                (detectedContext.detected_mode === 'dev_delphi' && item.href === '/dashboard/prompts') ||
                (detectedContext.detected_mode === 'dev_oracle' && item.href === '/dashboard/prompts') ||
                (detectedContext.detected_mode === 'architecture' && item.href === '/dashboard/insights')
              );

              const btn = (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    if (isInsights) setUnreadCount(0);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
                    sidebarOpen ? "px-3 py-2" : "justify-center px-0 py-2",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : contextHighlight
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {sidebarOpen && <span className="flex-1 text-left truncate">{item.label}</span>}
                  {sidebarOpen && isInsights && unreadCount > 0 && (
                    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {!sidebarOpen && isInsights && unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-red-500" />
                  )}
                  {sidebarOpen && active && !isInsights && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              );

              if (!sidebarOpen) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <div className="relative">{btn}</div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.label}{isInsights && unreadCount > 0 ? ` (${unreadCount} não lidos)` : ''}
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return <div key={item.href}>{btn}</div>;
            })}

            <Separator className="my-2" />

            {/* Settings */}
            {(() => {
              const active = mounted && pathname === '/dashboard/admin/worker';
              const btn = (
                <button
                  onClick={() => navigate('/dashboard/admin/worker')}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
                    sidebarOpen ? "px-3 py-2" : "justify-center px-0 py-2",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}
                >
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  {sidebarOpen && <span className="flex-1 text-left">Settings</span>}
                </button>
              );
              if (!sidebarOpen) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right">Settings</TooltipContent>
                  </Tooltip>
                );
              }
              return btn;
            })()}
          </nav>

          {/* Logout */}
          <div className="px-2 py-2 border-t border-sidebar-border flex-shrink-0">
            {(() => {
              const btn = (
                <button
                  onClick={handleLogout}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors",
                    sidebarOpen ? "px-3 py-2" : "justify-center px-0 py-2"
                  )}
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  {sidebarOpen && <span className="flex-1 text-left">Logout</span>}
                </button>
              );
              if (!sidebarOpen) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right">Logout</TooltipContent>
                  </Tooltip>
                );
              }
              return btn;
            })()}
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <header className="h-14 bg-card border-b flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-8 w-8"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Search trigger */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                title="Busca global (Cmd+K)"
                className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Buscar</span>
                <kbd className="ml-1 text-[10px] bg-muted px-1 rounded">⌘K</kbd>
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                title="Busca global (Cmd+K)"
                className="sm:hidden h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground">
                U
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-card border rounded-lg w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Buscar prompts..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Esc</kbd>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto">
              {searchLoading && (
                <p className="text-xs text-muted-foreground text-center py-6">Buscando...</p>
              )}
              {!searchLoading && searchQuery && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum resultado para &ldquo;{searchQuery}&rdquo;</p>
              )}
              {!searchLoading && !searchQuery && (
                <p className="text-xs text-muted-foreground text-center py-6">Digite para buscar prompts...</p>
              )}
              {searchResults.map(r => (
                <button
                  key={r.id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-b last:border-b-0"
                  onClick={() => { setSearchOpen(false); router.push(`/dashboard/prompts/${r.id}`); }}
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{r.name}</p>
                    {r.category && <p className="text-xs text-muted-foreground">{r.category}</p>}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>

            <div className="px-4 py-2 border-t flex items-center gap-3 text-[10px] text-muted-foreground">
              <span><kbd className="bg-muted px-1 rounded">↑↓</kbd> navegar</span>
              <span><kbd className="bg-muted px-1 rounded">Enter</kbd> abrir</span>
              <span><kbd className="bg-muted px-1 rounded">Esc</kbd> fechar</span>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
