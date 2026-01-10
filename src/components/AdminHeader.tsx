import React from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import Link from 'next/link';

export const AdminHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-900 border-b border-neutral-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <ShieldCheck className="text-red-500 w-6 h-6 group-hover:scale-110 transition-transform" />
          <h1 className="text-lg font-bold tracking-tight text-white">Cinefeel Admin</h1>
        </Link>
        
        <Link 
          href="/" 
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Exit to Site
        </Link>
      </div>
    </header>
  );
};
