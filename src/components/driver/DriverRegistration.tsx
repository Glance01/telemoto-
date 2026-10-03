import React from 'react';
import { Bike, Sparkles } from 'lucide-react';

export const DriverRegistration: React.FC = () => {
  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-center space-y-4 shadow-xl">
      <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
        <Bike className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center justify-center gap-2">
          <span>Modelo Antigo Eliminado</span>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          O modelo e formulários de motoristas foram apagados. A aguardar as suas instruções para começarmos a reconstrução do zero com um design sofisticado.
        </p>
      </div>
    </div>
  );
};
