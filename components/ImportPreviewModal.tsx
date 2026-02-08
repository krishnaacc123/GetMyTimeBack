import React, { useRef, useEffect, useMemo } from 'react';
import RetroButton from './RetroButton';
import { formatDateRetro } from '../utils/time';
import { StudyLog, AppSettings } from '../types';

interface ImportPreviewModalProps {
  importData: { logs: StudyLog[], settings: AppSettings };
  newLogsCount: number;
  duplicateLogsCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ 
    importData, 
    newLogsCount, 
    duplicateLogsCount, 
    onConfirm, 
    onCancel 
}) => {
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

  const dateRange = useMemo(() => {
      if (importData.logs.length === 0) return "No logs found";
      const sorted = [...importData.logs].sort((a, b) => a.timestamp - b.timestamp);
      const start = formatDateRetro(sorted[0].timestamp);
      const end = formatDateRetro(sorted[sorted.length - 1].timestamp);
      return start === end ? start : `${start} - ${end}`;
  }, [importData.logs]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="bg-white border-4 border-black shadow-retro p-6 w-full max-w-sm relative backdrop:bg-black/50 backdrop:backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 open:block m-auto z-[60]"
    >
      <h2 className="text-2xl font-display mb-4 text-center border-b-4 border-black pb-2 text-black">Import Preview</h2>
      
      <div className="space-y-4 mb-6">
          <div className="bg-retro-paper border-2 border-black p-4">
              <h3 className="font-bold uppercase text-xs tracking-widest text-gray-500 mb-2">Sessions Found</h3>
              <p className="font-display text-4xl text-black">{importData.logs.length}</p>
          </div>

          <div className="flex gap-4">
               <div className="flex-1 bg-green-100 border-2 border-black p-2">
                   <p className="font-bold uppercase text-[10px] tracking-widest text-green-800">New</p>
                   <p className="font-display text-2xl text-black">+{newLogsCount}</p>
               </div>
               <div className="flex-1 bg-gray-100 border-2 border-black p-2">
                   <p className="font-bold uppercase text-[10px] tracking-widest text-gray-500">Duplicates</p>
                   <p className="font-display text-2xl text-gray-400">{duplicateLogsCount}</p>
               </div>
          </div>

          <div>
               <p className="font-bold uppercase text-xs tracking-widest text-gray-500 mb-1">Date Range</p>
               <p className="font-mono text-sm border-2 border-black p-1 bg-white inline-block text-black">{dateRange}</p>
          </div>
          
          <div className="text-xs text-gray-600 italic border-t-2 border-dashed border-gray-300 pt-2">
              * Imported data will be merged.<br/>
              * Settings from the file will be applied.
          </div>
      </div>

      <div className="flex gap-4">
        <RetroButton variant="secondary" onClick={onCancel} className="flex-1 text-sm py-2">
          Cancel
        </RetroButton>
        <RetroButton variant="success" onClick={onConfirm} className="flex-1 text-sm py-2">
          Merge & Import
        </RetroButton>
      </div>
    </dialog>
  );
};

export default ImportPreviewModal;