import React, { useRef, useEffect } from 'react';
import RetroButton from './RetroButton';
import { useLanguage } from '../contexts/LanguageContext';

interface BackgroundInfoModalProps {
  onDismiss: () => void;
}

const BackgroundInfoModal: React.FC<BackgroundInfoModalProps> = ({ onDismiss }) => {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onDismiss();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="bg-white border-4 border-black shadow-retro p-6 w-full max-w-sm text-center transform rotate-1 backdrop:bg-black/80 backdrop:backdrop-blur-sm m-auto open:block animate-in fade-in"
    >
      <div className="w-12 h-12 bg-retro-blue rounded-full mx-auto mb-4 border-2 border-black flex items-center justify-center text-2xl">
        ℹ️
      </div>
      <h2 className="text-3xl font-display mb-2 stroke-black text-retro-yellow" style={{ WebkitTextStroke: '1px black' }}>
        {t('bgTitle')}
      </h2>
      <p className="mb-6 text-lg font-bold text-gray-700">
        {t('bgMsg')}
      </p>
      <RetroButton variant="primary" onClick={onDismiss} className="w-full">
        {t('gotIt')}
      </RetroButton>
    </dialog>
  );
};

export default BackgroundInfoModal;