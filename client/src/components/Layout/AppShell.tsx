import type { ReactNode } from 'react';
import Header from './Header';

interface AppShellProps {
  children: ReactNode;
  showHeader?: boolean;
}

export default function AppShell({ children, showHeader = true }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-surface-900 text-white">
      {showHeader && <Header />}
      <main className="flex flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
