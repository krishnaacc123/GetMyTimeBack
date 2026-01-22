import React, { useState, useRef, useEffect } from 'react';
import RetroButton from './RetroButton';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsModalProps {
  studyTime: number;
  breakTime: number;
  onSave: (study: number, brk: number) => void;
  onClose: () => void;
}

const PRESETS = [
  {
    title: "Pomodoro",
    work: 25,
    break: 5,
    desc: "Study for 25 minutes, then take a 5-minute break; repeat."
  },
  {
    title: "Cycle Breaks",
    work: 90,
    break: 15,
    desc: "Use the brain's 90-minute alertness cycle, taking a 15-minute break after each cycle."
  },
  {
    title: "Short Bursts",
    work: 20,
    break: 5,
    desc: "Aim for 20-45 minute sessions with short breaks in between, as deep focus wanes quickly."
  }
];

const SettingsModal: React.FC<SettingsModalProps> = ({ studyTime, breakTime, onSave, onClose }) => {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  
  // Initialize with strings to allow empty input state
  const [localStudy, setLocalStudy] = useState<string>(studyTime.toString());
  const [localBreak, setLocalBreak] = useState<string>(breakTime.toString());
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
    const s = parseInt(localStudy, 10);
    const b = parseInt(localBreak, 10);

    // Validation
    if (!localStudy || isNaN(s) || s < 1) {
      setError(t('workError'));
      return;
    }
    
    if (!localBreak || isNaN(b) || b < 1) {
      setError(t('breakError'));
      return;
    }

    setError(null);
    onSave(s, b);
  };

  const handlePresetClick = (work: number, brk: number) => {
    setLocalStudy(work.toString());
    setLocalBreak(brk.toString());
    setError(null);
  };

  const handleSuggestBreak = () => {
    const s = parseInt(localStudy, 10);
    if (!isNaN(s)) {
      // Check if current study time matches a preset
      const preset = PRESETS.find(p => p.work === s);
      
      let suggested: number;
      if (preset) {
        suggested = preset.break;
      } else {
        // Ratio 1:4 => Break = Work / 4
        suggested = Math.round(s / 4);
        if (suggested < 1) suggested = 1;
      }
      
      setLocalBreak(suggested.toString());
      setError(null);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    // Clear error when user starts typing again
    if (error) setError(null);
  };

  return (
    <dialog 
      ref={dialogRef}
      onCancel={handleCancel}
      className="bg-white border-4 border-black shadow-retro p-6 w-full max-w-lg relative backdrop:bg-black/50 backdrop:backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 open:block max-h-[90vh] overflow-y-auto m-auto"
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-100 hover:text-red-600 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all z-10 focus:outline-none focus:ring-4 focus:ring-retro-blue focus:ring-offset-2"
        aria-label="Close Settings"
      >
        <span className="font-display text-xl leading-none mt-0.5">X</span>
      </button>

      <h2 className="text-3xl font-display mb-6 text-center border-b-4 border-black pb-2">{t('settingsTitle')}</h2>
      
      {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 mb-4 text-sm font-bold" role="alert">
              <p>{error}</p>
          </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="flex-1 space-y-4">
          <div>
            <label htmlFor="work-duration" className="block font-bold mb-2">{t('workDurationLabel')}</label>
            <input 
              id="work-duration"
              type="number"
              min="1" 
              value={localStudy}
              onChange={handleInputChange(setLocalStudy)}
              className="w-full p-3 border-4 border-black font-display text-xl bg-retro-paper focus:outline-none focus:ring-4 ring-retro-blue"
            />
          </div>
          <div>
            <label htmlFor="break-duration" className="block font-bold mb-2">{t('breakDurationLabel')}</label>
            <input 
              id="break-duration"
              type="number"
              min="1" 
              value={localBreak}
              onChange={handleInputChange(setLocalBreak)}
              className="w-full p-3 border-4 border-black font-display text-xl bg-retro-paper focus:outline-none focus:ring-4 ring-retro-blue"
            />
            <button 
              type="button"
              onClick={handleSuggestBreak}
              className="mt-2 text-sm font-bold text-gray-500 hover:text-black underline decoration-dashed underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-retro-blue focus:ring-offset-1 rounded"
            >
              {t('useSuggested')}
            </button>
          </div>
        </div>

        {/* Quick Presets Column */}
        <div className="flex-1 border-l-0 md:border-l-2 border-dashed border-gray-300 md:pl-6 pt-4 md:pt-0 border-t-2 md:border-t-0 mt-4 md:mt-0">
            <label className="block font-bold mb-3 text-gray-500 uppercase text-sm tracking-widest">{t('quickPresets')}</label>
            <div className="space-y-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  onClick={() => handlePresetClick(preset.work, preset.break)}
                  className="w-full text-left bg-white border-2 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-retro-yellow active:bg-retro-yellow/80 transition-all duration-150 group focus:outline-none focus:ring-4 focus:ring-retro-blue focus:ring-offset-2"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold font-display text-lg group-hover:underline decoration-wavy underline-offset-2">{preset.title}</span>
                    <span className="text-xs font-mono bg-black text-white px-2 py-0.5 rounded-full">{preset.work}/{preset.break}</span>
                  </div>
                  <p className="text-xs leading-tight text-gray-600 font-body">
                    {preset.desc}
                  </p>
                </button>
              ))}
            </div>
        </div>
      </div>

      <div className="flex gap-4">
          <RetroButton variant="secondary" onClick={onClose} className="flex-1">{t('cancel')}</RetroButton>
          <RetroButton variant="success" onClick={handleSave} className="flex-1">{t('save')}</RetroButton>
      </div>
    </dialog>
  );
};

export default SettingsModal;