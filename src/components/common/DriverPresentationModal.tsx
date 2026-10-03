import React from 'react';

interface DriverPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver?: any;
  trip?: any;
  onCall?: () => void;
  onChat?: () => void;
}

export const DriverPresentationModal: React.FC<DriverPresentationModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl max-w-sm w-full text-center space-y-3">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Apresentação do Motorista</h3>
        <p className="text-xs text-neutral-500">Modelo em reconstrução do zero.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-xl font-bold text-xs"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
