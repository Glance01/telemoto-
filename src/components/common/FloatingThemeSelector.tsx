import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import { ThemeSelectorModal } from './ThemeSelector';

export const FloatingThemeSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 p-3 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer group"
        title="Mudar Tema do App"
      >
        <Palette className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-extrabold hidden sm:inline">Tema</span>
      </button>

      <ThemeSelectorModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
