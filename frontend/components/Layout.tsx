'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Ensure component only renders on client to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Determine active state safely (only check when mounted to avoid hydration issues)
  const isDashboardActive = mounted && (pathname === '/dashboard' || pathname?.startsWith('/dashboard/prompts'));
  const isWorkerConfigActive = mounted && pathname === '/dashboard/admin/worker';

  // Return a simple div during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen bg-gray-50">
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">PromptVault</h1>
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <li>
                <div className="flex items-center px-4 py-2 rounded-lg text-gray-700">
                  <span>Dashboard</span>
                </div>
              </li>
              <li>
                <div className="flex items-center px-4 py-2 rounded-lg text-gray-700">
                  <span>⚙️ Worker Config</span>
                </div>
              </li>
            </ul>
          </nav>
          <div className="p-4 border-t border-gray-200">
            <div className="w-full flex items-center justify-center px-4 py-2 text-gray-700 rounded-lg">
              <span className="mr-2">🚪</span>
              <span>Logout</span>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50" suppressHydrationWarning>
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* App Title */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">PromptVault</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <Link
                href="/dashboard"
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  isDashboardActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/admin/worker"
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  isWorkerConfigActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>⚙️ Worker Config</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
          >
            <span className="mr-2">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
