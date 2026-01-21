import React from 'react';
import RetroButton from './RetroButton';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white border-4 border-black shadow-retro p-6 w-full max-w-sm text-center">
        <h2 className="text-3xl font-display mb-4 text-retro-pink stroke-black" style={{ WebkitTextStroke: '1px black' }}>
          {title}
        </h2>
        <p className="mb-8 text-lg font-bold">{message}</p>
        <div className="flex gap-4 justify-center">
          <RetroButton variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </RetroButton>
          <RetroButton variant="danger" onClick={onConfirm} className="flex-1">
            Confirm
          </RetroButton>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;