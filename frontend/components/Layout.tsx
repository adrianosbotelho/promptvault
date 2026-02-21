'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50">
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
                  pathname === '/dashboard'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Dashboard</span>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
