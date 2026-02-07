import React, { useState, useEffect, useCallback } from 'react';
import { TimerMode } from './types';
import { formatTime, formatDuration } from './utils/time';
import RetroButton from './components/RetroButton';
import SettingsModal from './components/SettingsModal';
import StatsBoard from './components/StatsBoard';
import SessionSummaryModal from './components/SessionSummaryModal';
import FeedbackModal from './components/FeedbackModal';
import ManualLogModal from './components/ManualLogModal';
import { getRandomQuote } from './utils/quotes';
import { useLanguage } from './contexts/LanguageContext';
import { useSettings } from './contexts/SettingsContext';
import { useLogs } from './contexts/LogsContext';
import { useTimer } from './contexts/TimerContext';
import { LANGUAGES, LanguageCode } from './utils/translations';
import { APP_VERSION } from './constants';

// Types for background images
const BG_LIGHT = "https://picsum.photos/id/20/1920/1080"; // Notebook style

const App: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { settings, toggleSound } = useSettings();
  const { todayStats } = useLogs();
  const { 
    mode, timeLeft, isActive, totalDuration, summaryData, pausedTimeLeft,
    startSession, takeBreak, resumeSession, endSessionAndLog,
    handleNextSession, clearSummary, finishBreakOvertime
  } = useTimer();

  // Modals UI state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [showManualLog, setShowManualLog] = useState<boolean>(false);
  
  // Static Quote for this session load
  const [quote] = useState(() => getRandomQuote());

  // --- Helpers ---
  const openModal = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(true);
    window.history.pushState({ modal: true }, '');
  }, []);

  const closeModal = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    // Navigate back to remove the modal state
    window.history.back();
  }, []);

  // --- Back Button Handling for UI Modals ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (showSettings) { setShowSettings(false); return; }
      if (showStats) { setShowStats(false); return; }
      if (showFeedback) { setShowFeedback(false); return; }
      if (showManualLog) { setShowManualLog(false); return; }
      // Summary Modal is handled by TimerContext state clearing if needed, or explicitly here
      if (summaryData) { 
        clearSummary(); 
        return; 
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showSettings, showStats, showFeedback, showManualLog, summaryData, clearSummary]);

  // --- Keyboard Shortcuts (Spacebar) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // 1. Check if any modal is active. If so, ignore spacebar to avoid conflicts.
        if (showSettings || showStats || showFeedback || showManualLog || summaryData) {
            return;
        }

        // 2. Check if focus is on an interactive element
        const activeEl = document.activeElement;
        const tag = activeEl?.tagName;
        const isInteractive = 
            tag === 'INPUT' || 
            tag === 'TEXTAREA' || 
            tag === 'SELECT' || 
            tag === 'BUTTON' || 
            (activeEl as HTMLElement)?.isContentEditable;

        if (isInteractive) {
            return;
        }

        // Prevent default scrolling behavior of spacebar
        e.preventDefault();

        // 3. Execute Timer Actions
        if (mode === TimerMode.IDLE) {
            startSession();
        } else if (mode === TimerMode.STUDY) {
            takeBreak();
        } else if (mode === TimerMode.BREAK) {
            resumeSession();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode, 
    showSettings, showStats, showFeedback, showManualLog, summaryData,
    startSession, takeBreak, resumeSession
  ]);

  const handleModalCloseRequest = () => {
    window.history.back();
  };
  
  // Determine handler for End Session in Summary Modal
  const handleSummaryEndSession = useCallback(() => {
     if (summaryData?.finishedNaturally && summaryData.type === 'BREAK') {
         finishBreakOvertime();
     } else {
         clearSummary();
     }
  }, [summaryData, finishBreakOvertime, clearSummary]);

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative bg-[#fdf6e3] text-black font-body transition-colors duration-500"
    >
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center mix-blend-overlay"
        style={{ backgroundImage: `url(${BG_LIGHT})` }}
      />
      
      {/* Top Bar */}
      <div className="absolute top-4 right-4 z-20 flex flex-wrap justify-end gap-2">
         <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="appearance-none p-2 pr-8 border-2 border-black rounded-full shadow-retro transition-transform active:translate-y-1 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-[#80d8ff] cursor-pointer bg-white text-black"
              aria-label="Select Language"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="text-black bg-white">
                  {lang.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
         </div>

         {/* Sound Toggle */}
         <button 
          onClick={toggleSound} 
          className="p-2 border-2 border-black rounded-full shadow-retro transition-transform active:translate-y-1 focus:outline-none focus:ring-4 focus:ring-[#80d8ff] bg-white text-black"
          aria-label={t('toggleSound')}
          title={t('soundTooltip')}
         >
           {settings.soundEnabled ? '🔊' : '🔇'}
         </button>

         <button 
          onClick={() => openModal(setShowStats)} 
          className="p-2 bg-[#80d8ff] border-2 border-black rounded-full shadow-retro transition-transform active:translate-y-1 focus:outline-none focus:ring-4 focus:ring-black"
          aria-label={t('viewStats')}
         >
           📊
         </button>
      </div>

      <div className="relative z-10 bg-white border-4 border-black shadow-retro p-8 pt-10 w-full max-w-md text-center transform rotate-1 hover:rotate-0 transition-all duration-300">
        
        <h1 
          className="text-6xl font-display mb-2 stroke-black text-[#ffeb3b]" 
          style={{ WebkitTextStroke: '2px black' }}
        >
          {t('title')}
        </h1>
        <p className="font-body text-sm font-bold text-gray-500 mb-6 -mt-2">{t('appSubtitle')}</p>
        
        {/* Quote / Status Badge */}
        <div className="min-h-[60px] mb-4 flex flex-col justify-center items-center">
          {mode === TimerMode.IDLE ? (
            <div className="bg-[#fdf6e3] border-2 border-black p-2 -rotate-1 shadow-sm max-w-xs transition-colors">
              <p className="font-body italic text-sm text-black">"{quote}"</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
               <div className="flex items-center gap-2 relative">
                   <p className="font-bold text-gray-500 uppercase tracking-widest text-sm">
                     {mode === TimerMode.STUDY ? t('keepGrinding') : t('chillingTime')}
                   </p>
                   {mode === TimerMode.BREAK && (
                     <div className="group relative flex items-center">
                        <div className="w-5 h-5 rounded-full border-2 border-black bg-[#80d8ff] text-white flex items-center justify-center font-display text-sm cursor-help shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:translate-x-px hover:shadow-none transition-all ml-1">
                            i
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 hidden group-hover:block text-left">
                            <p className="font-body text-xs leading-relaxed text-black normal-case">
                                {t('breakTimerHint')}
                            </p>
                        </div>
                     </div>
                   )}
               </div>
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors">
                  <div className="relative flex h-3 w-3">
                    {isActive && (
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${mode === TimerMode.STUDY ? 'bg-red-500' : 'bg-green-500'}`}></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${mode === TimerMode.STUDY ? 'bg-red-500' : 'bg-green-500'}`}></span>
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wider text-black">
                    {mode === TimerMode.STUDY ? t('focusing') : t('chilling')}
                  </span>
               </div>
            </div>
          )}
        </div>

        {/* Timer Display */}
        <div className="mb-6 relative flex flex-col items-center justify-center">
          {mode === TimerMode.IDLE ? (
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 openModal(setShowSettings);
               }}
               className="group flex flex-col items-center justify-center py-4 px-8 border-2 border-transparent hover:border-black hover:bg-white hover:shadow-retro-hover rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#80d8ff] focus:border-black"
               aria-label={`Current target duration is ${settings.studyDuration} minutes. Click to edit.`}
             >
                <div className="flex items-baseline gap-2 text-black/80 group-hover:text-black transition-colors">
                   <span className="text-8xl font-display text-black">{settings.studyDuration}</span>
                   <span className="text-3xl font-bold text-gray-400 group-hover:text-black/60 font-body lowercase">min</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-sm font-bold uppercase tracking-widest text-gray-400 group-hover:text-[#80d8ff] transition-colors">{t('targetDuration')}</p>
                   <span className="text-sm text-[#80d8ff]">✏️</span>
                </div>
             </button>
          ) : (
            <div className="flex flex-col items-center">
               <div className="flex items-center justify-center gap-4 sm:gap-6">
                   <div className="flex items-center justify-center">
                       <div className="w-[220px] sm:w-[280px] text-center text-8xl font-display tabular-nums tracking-wider text-black drop-shadow-md" aria-label={`${Math.floor(timeLeft / 60)} minutes and ${timeLeft % 60} seconds remaining`}>
                         {formatTime(timeLeft)}
                       </div>
                   </div>
               </div>
            </div>
          )}
          
          {isActive && (
             <div 
               role="progressbar" 
               aria-valuenow={Math.min(100, (timeLeft / totalDuration) * 100)} 
               aria-valuemin={0} 
               aria-valuemax={100}
               aria-label="Session Progress"
               className="w-full h-4 border-2 border-black mt-4 rounded-full overflow-hidden bg-gray-200"
             >
               <div 
                 className={`h-full transition-all duration-1000 ease-linear ${mode === TimerMode.BREAK ? 'bg-[#b9f6ca]' : 'bg-[#ff80ab]'}`}
                 style={{ 
                   width: `${Math.min(100, (timeLeft / totalDuration) * 100)}%` 
                  }}
               />
             </div>
          )}

          {mode === TimerMode.BREAK && pausedTimeLeft !== null && (
            <div className="mt-2 text-xs font-bold text-gray-400 opacity-80 font-mono">
               {t('timeLeftInSession')} {formatTime(pausedTimeLeft)}
            </div>
          )}
        </div>

        {/* IDLE Stats */}
        {mode === TimerMode.IDLE && (
           <div className="mb-6 flex gap-4 justify-center items-center">
              <div className="bg-white border-2 border-black p-3 shadow-retro-hover transform -rotate-2 transition-colors">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mb-1">{t('workToday')}</p>
                <p className="font-display text-2xl leading-none text-black">{formatDuration(todayStats.totalSeconds)}</p>
              </div>
              <div className="transform rotate-2 relative">
                <div className="bg-white border-2 border-black p-3 pr-8 shadow-retro-hover min-w-[90px] transition-colors">
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mb-1">{t('sessions')}</p>
                    <p className="font-display text-2xl leading-none text-black">{todayStats.sessions}</p>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(setShowManualLog);
                      }}
                      className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-[#80d8ff] border-2 border-black text-white flex items-center justify-center font-bold text-lg leading-none shadow-sm hover:scale-110 active:translate-y-[1px] active:shadow-none transition-all focus:outline-none focus:ring-2 focus:ring-black z-10"
                      title="Add missing entry!"
                      aria-label="Add missing entry!"
                    >
                      <span className="mt-[-2px]">+</span>
                    </button>
                </div>
              </div>
           </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-4">
          {mode === TimerMode.IDLE ? (
             <RetroButton onClick={startSession} className="w-full text-2xl py-4">
               {t('startWorking')}
             </RetroButton>
          ) : mode === TimerMode.BREAK ? (
            <>
              <div className="flex gap-4">
                <RetroButton 
                  onClick={resumeSession} 
                  variant="success" 
                  className="flex-1"
                >
                  {t('resumeSession')}
                </RetroButton>
                <RetroButton onClick={endSessionAndLog} variant="danger" className="flex-1">
                  {t('endSession')}
                </RetroButton>
              </div>
              <p className="mt-4 text-sm text-gray-400 font-mono">
                {t('sessionPaused')}
              </p>
            </>
          ) : (
            <>
              <div className="flex gap-4">
                <RetroButton 
                  onClick={takeBreak} 
                  variant="success" 
                  className="flex-1"
                >
                  {t('takeBreak')}
                </RetroButton>
                <RetroButton onClick={endSessionAndLog} variant="danger" className="flex-1">
                  {t('endSession')}
                </RetroButton>
              </div>
              <p className="mt-4 text-sm text-gray-400 font-mono">
                {t('autoRenew')}
              </p>
            </>
          )}
        </div>
      </div>

      <footer className="mt-8 relative z-10 text-center flex items-center justify-center gap-1 flex-wrap">
        <span className="font-body text-xs font-bold text-gray-600">
          Made with ❤️ by Krishna
        </span>
        <a 
          href="https://github.com/krishnaacc123" 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-body text-xs font-bold transition-colors text-gray-600 hover:text-black"
          aria-label="GitHub Profile"
        >
          🔗
        </a>
         <button 
           onClick={() => openModal(setShowFeedback)}
           className="font-body text-xs font-bold ml-4 hover:underline text-gray-600 hover:text-black"
         >
           💬 {t('feedbackTitle')}
         </button>
         
         <div 
            className="ml-4 cursor-help opacity-70 hover:opacity-100 transition-opacity text-gray-600"
            title={t('desktopHint')}
         >
            <span className="text-xl">🖥️</span>
         </div>
         
         {/* Version Display */}
         <div className="w-full mt-2">
            <span className="font-mono text-[10px] opacity-40 text-black">
                {APP_VERSION}
            </span>
         </div>
      </footer>

      {showSettings && (
        <SettingsModal 
          onClose={handleModalCloseRequest}
        />
      )}

      {showManualLog && (
        <ManualLogModal 
            onClose={handleModalCloseRequest} 
        />
      )}

      {showStats && (
        <StatsBoard 
          onClose={handleModalCloseRequest}
        />
      )}

      {showFeedback && (
        <FeedbackModal 
          onClose={handleModalCloseRequest}
        />
      )}

      {summaryData && (
        <SessionSummaryModal 
          data={summaryData}
          onNext={handleNextSession}
          onEndSession={handleSummaryEndSession}
        />
      )}

    </div>
  );
};

export default App;