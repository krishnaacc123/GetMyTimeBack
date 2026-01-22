import React, { useRef, useEffect } from 'react';
import RetroButton from './RetroButton';
import { useLanguage } from '../contexts/LanguageContext';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel }) => {
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
    onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="bg-white border-4 border-black shadow-retro p-6 w-full max-w-sm text-center backdrop:bg-black/80 backdrop:backdrop-blur-sm m-auto open:block"
    >
      <h2 className="text-3xl font-display mb-4 text-retro-pink stroke-black" style={{ WebkitTextStroke: '1px black' }}>
        {title}
      </h2>
      <p className="mb-8 text-lg font-bold">{message}</p>
      <div className="flex gap-4 justify-center">
        <RetroButton variant="secondary" onClick={onCancel} className="flex-1">
          {t('cancel')}
        </RetroButton>
        <RetroButton variant="danger" onClick={onConfirm} className="flex-1">
          {t('confirm')}
        </RetroButton>
      </div>
    </dialog>
  );
};

export default ConfirmationModal;