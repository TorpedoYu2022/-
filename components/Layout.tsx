
import React from 'react';

export const Header: React.FC = () => (
  <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-50">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2v4a2 2 0 002 2h4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">B2B Comic Forge</h1>
      </div>
      <nav className="text-sm font-medium text-slate-500">
        Turn Whitepapers into Stories
      </nav>
    </div>
  </header>
);

export const Footer: React.FC = () => (
  <footer className="bg-slate-50 border-t border-slate-200 py-8 px-6 mt-12">
    <div className="max-w-6xl mx-auto text-center text-slate-400 text-sm">
      &copy; {new Date().getFullYear()} B2B Comic Forge. Powered by Gemini AI.
    </div>
  </footer>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);
