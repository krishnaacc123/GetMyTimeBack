import React, { useState } from 'react';
import RetroButton from './RetroButton';

interface SettingsModalProps {
  studyTime: number;
  breakTime: number;
  onSave: (study: number, brk: number) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ studyTime, breakTime, onSave, onClose }) => {
  // Initialize with strings to allow empty input state
  const [localStudy, setLocalStudy] = useState<string>(studyTime.toString());
  const [localBreak, setLocalBreak] = useState<string>(breakTime.toString());
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const s = parseInt(localStudy, 10);
    const b = parseInt(localBreak, 10);

    // Validation
    if (!localStudy || isNaN(s) || s < 1) {
      setError("Work duration must be at least 1 minute.");
      return;
    }
    
    if (!localBreak || isNaN(b) || b < 1) {
      setError("Break duration must be at least 1 minute.");
      return;
    }

    setError(null);
    onSave(s, b);
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    // Clear error when user starts typing again
    if (error) setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-retro p-6 w-full max-w-sm relative">
          <h2 className="text-3xl font-display mb-6 text-center border-b-4 border-black pb-2">Session Setup</h2>
          
          {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 mb-4 text-sm font-bold" role="alert">
                  <p>{error}</p>
              </div>
          )}

          <div className="space-y-4 mb-8">
            <div>
              <label className="block font-bold mb-2">Work Duration (min)</label>
              <input 
                type="number"
                min="1" 
                value={localStudy}
                onChange={handleInputChange(setLocalStudy)}
                className="w-full p-3 border-4 border-black font-display text-xl bg-retro-paper focus:outline-none focus:ring-4 ring-retro-blue"
              />
            </div>
            <div>
              <label className="block font-bold mb-2">Break Duration (min)</label>
              <input 
                type="number"
                min="1" 
                value={localBreak}
                onChange={handleInputChange(setLocalBreak)}
                className="w-full p-3 border-4 border-black font-display text-xl bg-retro-paper focus:outline-none focus:ring-4 ring-retro-blue"
              />
            </div>
          </div>

          <div className="flex gap-4">
             <RetroButton variant="secondary" onClick={onClose} className="flex-1">Cancel</RetroButton>
             <RetroButton variant="success" onClick={handleSave} className="flex-1">Start!</RetroButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;