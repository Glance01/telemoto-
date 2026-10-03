import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, X, Check } from 'lucide-react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-6 text-neutral-900 dark:text-neutral-100">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Sun className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Personalizar Tema</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Escolha o modo visual da aplicação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODO CLARO / ESCURO */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
            Modo de Apresentação
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500 mb-1" />
              <span>Modo Claro</span>
              {theme === 'light' && <Check className="w-4 h-4 text-emerald-600 mt-1" />}
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <Moon className="w-5 h-5 text-indigo-400 mb-1" />
              <span>Modo Escuro</span>
              {theme === 'dark' && <Check className="w-4 h-4 text-emerald-400 mt-1" />}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-transform active:scale-[0.99] cursor-pointer"
        >
          Guardar & Concluir
        </button>
      </div>
    </div>
  );
};
