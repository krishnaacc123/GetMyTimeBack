import React, { useState, useRef, useEffect } from 'react';
import RetroButton from './RetroButton';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';

interface SettingsModalProps {
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

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { settings, updateSettings } = useSettings();
  const dialogRef = useRef<HTMLDialogElement>(null);
  
  const [localStudy, setLocalStudy] = useState<string>(settings.studyDuration.toString());
  const [localBreak, setLocalBreak] = useState<string>(settings.breakDuration.toString());
  const [localSound, setLocalSound] = useState<boolean>(settings.soundEnabled);
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
    updateSettings(s, b, localSound);
    onClose();
  };

  const handlePresetClick = (work: number, brk: number) => {
    setLocalStudy(work.toString());
    setLocalBreak(brk.toString());
    setError(null);
  };

  const handleSuggestBreak = () => {
    const s = parseInt(localStudy, 10);
    if (!isNaN(s)) {
      const preset = PRESETS.find(p => p.work === s);
      let suggested: number;
      if (preset) {
        suggested = preset.break;
      } else {
        suggested = Math.round(s / 4);
        if (suggested < 1) suggested = 1;
      }
      setLocalBreak(suggested.toString());
      setError(null);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
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
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-100 hover:text-red-600 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all z-10 focus:outline-none focus:ring-4 focus:ring-retro-blue focus:ring-offset-2"
        aria-label="Close Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <h2 className="text-3xl font-display mb-6 text-center border-b-4 border-black pb-2 text-black">{t('settingsTitle')}</h2>
      
      {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 mb-4 text-sm font-bold animate-pulse" role="alert">
              <p>{error}</p>
          </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="flex-1 space-y-4">
          <div>
            <label htmlFor="work-duration" className="block font-bold mb-2 text-black">{t('workDurationLabel')}</label>
            <input 
              id="work-duration"
              type="number"
              min="1" 
              value={localStudy}
              onChange={handleInputChange(setLocalStudy)}
              className="w-full p-3 border-4 border-black font-display text-xl bg-retro-paper focus:outline-none focus:ring-4 ring-retro-blue text-black"
            />
          </div>
          <div>
            <label htmlFor="break-duration" className="block font-bold mb-2 text-black">{t('breakDurationLabel')}</label>
            <input 
              id="break-duration"
              type="number"
              min="1" 
              value={localBreak}
              onChange={handleInputChange(setLocalBreak)}
              className="w-full p-3 border-4 border-black font-display text-xl bg-retro-paper focus:outline-none focus:ring-4 ring-retro-blue text-black"
            />
            <button 
              type="button"
              onClick={handleSuggestBreak}
              className="mt-2 text-sm font-bold text-gray-500 hover:text-black underline decoration-dashed underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-retro-blue focus:ring-offset-1 rounded"
            >
              {t('useSuggested')}
            </button>
          </div>
          
          <div className="pt-2 flex flex-col gap-4">
            {/* Sound Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={localSound}
                  onChange={(e) => setLocalSound(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-gray-300 border-2 border-black rounded-full peer-checked:bg-green-500 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] peer-focus:ring-4 peer-focus:ring-retro-blue"></div>
                <div className="absolute left-1 top-1 w-6 h-6 bg-white border-2 border-black rounded-full transition-transform peer-checked:translate-x-6"></div>
              </div>
              <span className="font-bold font-body text-lg group-hover:underline decoration-wavy text-black">Enable Sound</span>
            </label>
          </div>
        </div>

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
                    <span className="font-bold font-display text-lg group-hover:underline decoration-wavy underline-offset-2 text-black">{preset.title}</span>
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