import React, { useEffect, useState, useRef } from 'react';
import RetroButton from './RetroButton';
import { formatDuration } from '../utils/time';
import { getRandomQuote } from '../utils/quotes';

interface SessionSummaryModalProps {
  type: 'STUDY' | 'BREAK';
  durationSeconds: number;
  onNext: () => void;
  onEndSession: () => void;
  autoStart?: boolean;
  finishedNaturally: boolean;
}

const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({ 
  type, 
  durationSeconds, 
  onNext, 
  onEndSession,
  autoStart = false,
  finishedNaturally 
}) => {
  const [quote, setQuote] = useState('');
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<number | null>(null);

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
        return `Starting in ${countdown}...`;
    }
    if (type === 'BREAK') return "Back to Work!";
    return "Start Next Session";
  };

  const getTitle = () => {
    if (type === 'BREAK') return "Break Time Over";
    return "Session Complete!";
  };

  const getLabel = () => {
      if (type === 'BREAK') return "Break Duration";
      return "Time Worked";
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white border-4 border-black shadow-retro p-8 w-full max-w-md text-center transform scale-100 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        {/* Confetti-like decoration circles */}
        <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-retro-yellow border-2 border-black" />
        <div className="absolute top-4 right-6 w-6 h-6 rounded-full bg-retro-pink border-2 border-black" />
        <div className="absolute bottom-4 left-6 w-3 h-3 rounded-full bg-retro-blue border-2 border-black" />
        <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-retro-green border-2 border-black" />

        <h2 className="text-4xl font-display mb-2 stroke-black text-retro-yellow" style={{ WebkitTextStroke: '1px black' }}>
          {getTitle()}
        </h2>
        
        <div className="my-6">
          <p className="text-gray-500 uppercase text-xs font-bold tracking-widest mb-1">{getLabel()}</p>
          <p className="text-6xl font-display">{formatDuration(durationSeconds)}</p>
        </div>

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
                    Got it!
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
                        End Session
                    </RetroButton>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default SessionSummaryModal;