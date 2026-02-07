import React, { useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface FeedbackModalProps {
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
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
    onClose();
  };
  
  const subject = encodeURIComponent("GetMyTimeBack App Feedback");

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="bg-white border-4 border-black shadow-retro p-8 w-full max-w-md relative backdrop:bg-black/50 backdrop:backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 open:block m-auto"
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

      <h2 className="text-3xl font-display mb-4 text-center border-b-4 border-black pb-2">{t('feedbackTitle')}</h2>
      
      <div className="text-center py-4">
        <p className="mb-6 font-bold text-gray-600 text-lg">{t('feedbackIntro')}</p>

        <div className="bg-gray-50 border-2 border-dashed border-gray-400 p-6 rounded-lg hover:bg-retro-paper transition-colors duration-300">
           <a 
             href={`mailto:krishnaacc123@gmail.com?subject=${subject}`}
             className="font-display text-2xl sm:text-3xl text-blue-600 hover:text-blue-800 underline decoration-wavy underline-offset-4 transition-all break-all"
           >
             krishnaacc123@gmail.com
           </a>
        </div>
      </div>
    </dialog>
  );
};

export default FeedbackModal;