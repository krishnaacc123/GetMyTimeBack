import React, { useEffect, useState, useRef } from 'react';
import RetroButton from './RetroButton';
import { formatDuration } from '../utils/time';
import { getRandomQuote } from '../utils/quotes';
import { useLanguage } from '../contexts/LanguageContext';

interface SessionSummaryModalProps {
  type: 'STUDY' | 'BREAK';
  durationSeconds: number;
  studyDuration?: number;
  onNext: () => void;
  onEndSession: () => void;
  autoStart?: boolean;
  finishedNaturally: boolean;
}

const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({ 
  type, 
  durationSeconds, 
  studyDuration,
  onNext, 
  onEndSession,
  autoStart = false,
  finishedNaturally 
}) => {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quote, setQuote] = useState('');
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onEndSession();
  };

  useEffect(() => {
    setQuote(getRandomQuote());
  }, []);

  // Auto-start logic
  useEffect(() => {
    if (autoStart) {
      timerRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            onNext(); // Trigger next session automatically
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoStart, onNext]);

  const handleManualNext = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onNext();
  };

  const getButtonText = () => {
    if (autoStart) {
        return `${t('startingIn')} ${countdown}...`;
    }
    if (type === 'BREAK') return t('backToWork');
    return t('startNext');
  };

  const getTitle = () => {
    if (studyDuration && studyDuration > 0) return t('sessionComplete');
    if (type === 'BREAK') return t('breakOver');
    return t('sessionComplete');
  };

  const getLabel = () => {
      if (type === 'BREAK') return t('breakDuration');
      return t('timeWorked');
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="bg-white border-4 border-black shadow-retro p-8 w-full max-w-md text-center transform scale-100 animate-in zoom-in-95 duration-300 relative overflow-hidden backdrop:bg-black/80 backdrop:backdrop-blur-sm m-auto open:block"
    >
        {/* Confetti-like decoration circles */}
        <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-retro-yellow border-2 border-black" />
        <div className="absolute top-4 right-6 w-6 h-6 rounded-full bg-retro-pink border-2 border-black" />
        <div className="absolute bottom-4 left-6 w-3 h-3 rounded-full bg-retro-blue border-2 border-black" />
        <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-retro-green border-2 border-black" />

        <h2 className="text-4xl font-display mb-2 stroke-black text-retro-yellow" style={{ WebkitTextStroke: '1px black' }}>
          {getTitle()}
        </h2>
        
        {studyDuration && studyDuration > 0 ? (
            <div className="flex justify-center gap-4 my-6">
                <div className="flex-1 bg-retro-paper border-2 border-black p-2">
                    <p className="text-gray-500 uppercase text-xs font-bold tracking-widest mb-1">{t('timeWorked')}</p>
                    <p className="text-4xl font-display">{formatDuration(studyDuration)}</p>
                </div>
                <div className="flex-1 bg-white border-2 border-black p-2">
                    <p className="text-gray-500 uppercase text-xs font-bold tracking-widest mb-1">{t('breakDuration')}</p>
                    <p className="text-4xl font-display">{formatDuration(durationSeconds)}</p>
                </div>
            </div>
        ) : (
            <div className="my-6">
              <p className="text-gray-500 uppercase text-sm font-bold tracking-widest mb-1">{getLabel()}</p>
              <p className="text-6xl font-display">{formatDuration(durationSeconds)}</p>
            </div>
        )}

        <div className="bg-retro-paper border-2 border-black p-4 mb-6 rotate-1">
          <p className="font-body italic text-lg">"{quote}"</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
            {!finishedNaturally ? (
                <RetroButton 
                    type="button" 
                    variant="primary" 
                    onClick={onEndSession} 
                    className="flex-1"
                >
                    {t('gotIt')}
                </RetroButton>
            ) : (
                <>
                    <RetroButton 
                        type="button" 
                        variant="primary" 
                        onClick={handleManualNext} 
                        className="flex-1 transition-all"
                    >
                        {getButtonText()}
                    </RetroButton>
                    <RetroButton type="button" variant="secondary" onClick={onEndSession} className="flex-1">
                        {t('endSession')}
                    </RetroButton>
                </>
            )}
        </div>
    </dialog>
  );
};

export default SessionSummaryModal;