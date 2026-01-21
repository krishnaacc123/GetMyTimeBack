import React from 'react';
import RetroButton from './RetroButton';

interface BackgroundInfoModalProps {
  onDismiss: () => void;
}

const BackgroundInfoModal: React.FC<BackgroundInfoModalProps> = ({ onDismiss }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border-4 border-black shadow-retro p-6 w-full max-w-sm text-center transform rotate-1">
        <div className="w-12 h-12 bg-retro-blue rounded-full mx-auto mb-4 border-2 border-black flex items-center justify-center text-2xl">
          ℹ️
        </div>
        <h2 className="text-3xl font-display mb-2 stroke-black text-retro-yellow" style={{ WebkitTextStroke: '1px black' }}>
          Running in Background
        </h2>
        <p className="mb-6 text-lg font-bold text-gray-700">
          The timer will continue running even if you switch apps. You can control it from the notification panel!
        </p>
        <RetroButton variant="primary" onClick={onDismiss} className="w-full">
          Got it!
        </RetroButton>
      </div>
    </div>
  );
};

export default BackgroundInfoModal;