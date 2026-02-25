'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import { 
  LayoutDashboard, 
  FileText, 
  Lightbulb, 
  Bot, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  detectedContext?: {
    detected_mode: string;
    confidence: number;
  } | null;
}

export default function AppShell({ children, detectedContext }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleNavClick = (href: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('Navigating to:', href, 'Current pathname:', pathname);
    router.push(href);
  };

  // Determine active state safely
  const isDashboardActive = mounted && pathname === '/dashboard';
  const isPromptViewActive = mounted && pathname?.startsWith('/dashboard/prompts');
  const isInsightsActive = mounted && pathname === '/dashboard/insights';
  const isAgentActive = mounted && pathname === '/dashboard/agent';
  const isSettingsActive = mounted && pathname === '/dashboard/admin/worker';

  if (!mounted) {
    return (
      <div className="flex h-screen bg-[#0b0b0f] text-[#d8d9da]">
        <aside className="w-64 bg-[#1f1f23] border-r border-[#2c2c34] flex flex-col">
          <div className="p-4 border-b border-[#2c2c34]">
            <h1 className="text-lg font-semibold text-white">PromptVault</h1>
          </div>
          <nav className="flex-1 p-2">
            <ul className="space-y-1">
              <li><div className="px-3 py-2 text-[#d8d9da]">Dashboard</div></li>
              <li><div className="px-3 py-2 text-[#d8d9da]">Prompt View</div></li>
              <li><div className="px-3 py-2 text-[#d8d9da]">Insights</div></li>
              <li><div className="px-3 py-2 text-[#d8d9da]">Agent</div></li>
            </ul>
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, active: isDashboardActive },
    { href: '/dashboard/prompts', label: 'Prompt View', icon: FileText, active: isPromptViewActive },
    { href: '/dashboard/insights', label: 'Insights', icon: Lightbulb, active: isInsightsActive },
    { href: '/dashboard/agent', label: 'Agent', icon: Bot, active: isAgentActive },
  ];

  return (
    <div className="flex h-screen bg-[#0b0b0f] text-[#d8d9da]" suppressHydrationWarning>
      {/* Persistent Left Sidebar */}
      <aside className={`${
        sidebarOpen ? 'w-64' : 'w-0'
      } bg-[#1f1f23] border-r border-[#2c2c34] flex flex-col transition-all duration-200 overflow-hidden flex-shrink-0`}>
        {/* App Title */}
        <div className="h-16 px-4 border-b border-[#2c2c34] flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg font-semibold text-white">PromptVault</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded hover:bg-[#2c2c34] text-[#d8d9da] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              
              // Check if this nav item should be highlighted based on detected context
              const isContextHighlighted = detectedContext && detectedContext.confidence > 0.3 && (
                (detectedContext.detected_mode === 'dev_delphi' && item.href === '/dashboard/prompts') ||
                (detectedContext.detected_mode === 'dev_oracle' && item.href === '/dashboard/prompts') ||
                (detectedContext.detected_mode === 'architecture' && item.href === '/dashboard/insights')
              );
              
              const getContextColor = () => {
                if (!isContextHighlighted) return '';
                if (detectedContext.detected_mode === 'dev_delphi') return 'border-l-2 border-[#3274d9] bg-[#3274d9]/10';
                if (detectedContext.detected_mode === 'dev_oracle') return 'border-l-2 border-red-500 bg-red-500/10';
                if (detectedContext.detected_mode === 'architecture') return 'border-l-2 border-purple-500 bg-purple-500/10';
                return '';
              };
              
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={(e) => handleNavClick(item.href, e)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-all text-left ${
                      item.active
                        ? 'bg-[#2c2c34] text-white'
                        : isContextHighlighted
                        ? `text-white ${getContextColor()}`
                        : 'text-[#d8d9da] hover:bg-[#2c2c34] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {isContextHighlighted && (
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
                    )}
                    {item.active && !isContextHighlighted && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Settings Section */}
          <div className="mt-4 pt-4 border-t border-[#2c2c34]">
            <button
              type="button"
              onClick={(e) => handleNavClick('/dashboard/admin/worker', e)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors text-left ${
                isSettingsActive
                  ? 'bg-[#2c2c34] text-white'
                  : 'text-[#d8d9da] hover:bg-[#2c2c34] hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Settings</span>
              {isSettingsActive && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
            </button>
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-2 border-t border-[#2c2c34] flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-[#d8d9da] hover:bg-[#2c2c34] hover:text-white rounded text-sm transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-[#1f1f23] border-b border-[#2c2c34] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded hover:bg-[#2c2c34] text-[#d8d9da]"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="text-sm font-medium text-white">
              {pathname === '/dashboard' && 'Dashboard'}
              {pathname?.startsWith('/dashboard/prompts') && pathname !== '/dashboard/prompts' && 'Prompt Details'}
              {pathname === '/dashboard/prompts' && 'Prompt View'}
              {pathname === '/dashboard/insights' && 'Insights'}
              {pathname === '/dashboard/agent' && 'Agent'}
              {pathname === '/dashboard/admin/worker' && 'Settings'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#2c2c34] flex items-center justify-center text-xs font-medium text-[#d8d9da]">
              U
            </div>
          </div>
        </header>

        {/* Workspace Content */}
        <main className="flex-1 overflow-y-auto bg-[#0b0b0f]">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
