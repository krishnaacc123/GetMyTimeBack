import React, { useRef, useEffect, useState } from 'react';
import RetroButton from './RetroButton';
import { useLanguage } from '../contexts/LanguageContext';
import { useLogs } from '../contexts/LogsContext';

interface ManualLogModalProps {
  onClose: () => void;
}

type DateOption = 'TODAY' | 'YESTERDAY' | 'DAY_BEFORE';

const ManualLogModal: React.FC<ManualLogModalProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { addLog, logs } = useLogs();
  const dialogRef = useRef<HTMLDialogElement>(null);
  
  const [dateOption, setDateOption] = useState<DateOption>('TODAY');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  const handleSave = () => {
    if (!startTime || !endTime) return;

    // Construct dates based on selection
    const date = new Date();
    date.setSeconds(0);
    date.setMilliseconds(0);
    
    if (dateOption === 'YESTERDAY') {
        date.setDate(date.getDate() - 1);
    } else if (dateOption === 'DAY_BEFORE') {
        date.setDate(date.getDate() - 2);
    }

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startDate = new Date(date);
    startDate.setHours(startH, startM);

    const endDate = new Date(date);
    endDate.setHours(endH, endM);

    const now = new Date();
    
    // Validation
    if (endDate <= startDate) {
        setError(t('invalidTimeError'));
        return;
    }
    
    if (endDate > now) {
        setError(t('futureTimeError'));
        return;
    }
    
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    // Removed overlap check logic here to allow overlapping entries

    const durationSeconds = (endMs - startMs) / 1000;
    
    // Add Log using existing context logic
    // We pass explicit sessionId to group this as a single session if we want, 
    // or just let it be a single log. Let's make it a unique session.
    // isManual = true
    addLog('STUDY', durationSeconds, endMs, crypto.randomUUID(), true);
    
    onClose();
  };

  const DateButton = ({ option, label }: { option: DateOption, label: string }) => (
    <button
        type="button"
        onClick={() => setDateOption(option)}
        className={`flex-1 py-2 px-1 text-sm font-bold border-2 border-black transition-all ${
            dateOption === option 
            ? 'bg-retro-blue text-white shadow-sm translate-y-[2px]' 
            : 'bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none'
        }`}
    >
        {label}
    </button>
  );

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="bg-white border-4 border-black shadow-retro p-6 w-full max-w-sm relative backdrop:bg-black/50 backdrop:backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 open:block m-auto"
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-100 hover:text-red-600 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all z-10 focus:outline-none focus:ring-4 focus:ring-retro-blue focus:ring-offset-2"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <h2 className="text-3xl font-display mb-6 text-center border-b-4 border-black pb-2">{t('manualLogTitle')}</h2>

      {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 mb-4 text-xs font-bold animate-pulse" role="alert">
              <p>{error}</p>
          </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
            <label className="block font-bold text-sm uppercase tracking-wider text-gray-500 mb-2">{t('selectDate')}</label>
            <div className="flex gap-2">
                <DateButton option="TODAY" label={t('filterToday')} />
                <DateButton option="YESTERDAY" label={t('filterYesterday')} />
                <DateButton option="DAY_BEFORE" label={t('dayBeforeYesterday')} />
            </div>
        </div>

        <div className="flex gap-4">
            <div className="flex-1">
                <label className="block font-bold text-sm uppercase tracking-wider text-gray-500 mb-2">{t('startTime')}</label>
                <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => {
                        setStartTime(e.target.value);
                        setError(null);
                    }}
                    className="w-full p-2 border-2 border-black font-display text-xl bg-retro-paper focus:outline-none focus:ring-2 ring-retro-blue cursor-pointer"
                />
            </div>
            <div className="flex-1">
                <label className="block font-bold text-sm uppercase tracking-wider text-gray-500 mb-2">{t('endTime')}</label>
                <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => {
                        setEndTime(e.target.value);
                        setError(null);
                    }}
                    className="w-full p-2 border-2 border-black font-display text-xl bg-retro-paper focus:outline-none focus:ring-2 ring-retro-blue cursor-pointer"
                />
            </div>
        </div>
      </div>

      <div className="flex gap-4">
        <RetroButton variant="secondary" onClick={onClose} className="flex-1 text-base py-2">
          {t('cancel')}
        </RetroButton>
        <RetroButton variant="success" onClick={handleSave} className="flex-1 text-base py-2">
          {t('addLog')}
        </RetroButton>
      </div>
    </dialog>
  );
};

export default ManualLogModal;