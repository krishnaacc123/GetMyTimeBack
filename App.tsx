import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TimerMode, StudyLog, AppSettings, TimerState } from './types';
import { DEFAULT_STUDY_TIME, DEFAULT_BREAK_TIME, STORAGE_KEY_LOGS, STORAGE_KEY_SETTINGS, STORAGE_KEY_TIMER_STATE, SILENT_AUDIO_URL } from './constants';
import { formatTime, getDayKey, formatDuration } from './utils/time';
import { playAlarm } from './services/sound';
import { requestNotificationPermission, sendNotification } from './services/notification';
import RetroButton from './components/RetroButton';
import SettingsModal from './components/SettingsModal';
import StatsBoard from './components/StatsBoard';
import SessionSummaryModal from './components/SessionSummaryModal';
import BackgroundInfoModal from './components/BackgroundInfoModal';
import { getRandomQuote } from './utils/quotes';

// Types for background images
const BG_LIGHT = "https://picsum.photos/id/20/1920/1080"; // Notebook style
const BG_DARK = "https://picsum.photos/id/180/1920/1080"; // Laptop/Work

const App: React.FC = () => {
  // --- State ---
  const [mode, setMode] = useState<TimerMode>(TimerMode.IDLE);
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_STUDY_TIME * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  
  // Modals state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<{ type: 'STUDY' | 'BREAK', duration: number, finishedNaturally: boolean } | null>(null);
  const [showBackgroundInfo, setShowBackgroundInfo] = useState<boolean>(false);
  
  // Static Quote for this session load
  const [quote] = useState(() => getRandomQuote());
  
  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Persistent Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? JSON.parse(saved) : {
      studyDuration: DEFAULT_STUDY_TIME,
      breakDuration: DEFAULT_BREAK_TIME,
      isDarkMode: false
    };
  });

  // Logs
  const [logs, setLogs] = useState<StudyLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LOGS);
    return saved ? JSON.parse(saved) : [];
  });

  // --- Derived State ---
  const todayStats = useMemo(() => {
    const todayKey = getDayKey(Date.now());
    const todayLogs = logs.filter(l => l.type === 'STUDY' && getDayKey(l.timestamp) === todayKey);
    
    const totalSeconds = todayLogs.reduce((acc, log) => {
      // Handle potential legacy data
      const duration = log.durationSeconds ?? ((log as any).durationMinutes * 60) ?? 0;
      return acc + duration;
    }, 0);

    return {
      totalSeconds,
      sessions: todayLogs.length
    };
  }, [logs]);

  // --- Refs ---
  const endTimeRef = useRef<number | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const modeRef = useRef(mode);
  const settingsRef = useRef(settings);
  const completeSessionRef = useRef<() => void>(() => {});
  const pausedStudyTimeRef = useRef<number | null>(null);
  const activeSessionTotalTimeRef = useRef<number>(DEFAULT_STUDY_TIME);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Ref to prevent background warning when we programmatically navigate back
  const ignoreBackWarningRef = useRef<boolean>(false);
  
  // Ref to store what to do after summary modal closes
  const nextSessionActionRef = useRef<(() => void) | null>(null);

  // --- Synchronization Effects ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    if (settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // --- Helpers ---
  const openModal = useCallback((setter: React.Dispatch<React.SetStateAction<any>>, value: any, replace: boolean = false) => {
    setter(value);
    if (replace) {
        window.history.replaceState({ modal: true }, '');
    } else {
        window.history.pushState({ modal: true }, '');
    }
  }, []);

  const closeModal = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    // If closing via UI button, go back to remove history state
    window.history.back(); 
  };

  // --- Back Button Handling ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // 1. Close Modals if any are open
      if (showSettings) { setShowSettings(false); return; }
      if (showStats) { setShowStats(false); return; }
      
      // Special handling for summaryData to ensure state sync
      if (summaryData) { 
        setSummaryData(null); 
        return; 
      }
      
      if (showBackgroundInfo) { setShowBackgroundInfo(false); return; }

      // 2. Check if this pop was programmatic (e.g. session finished)
      if (ignoreBackWarningRef.current) {
        ignoreBackWarningRef.current = false;
        return;
      }

      // 3. If timer is running and we popped a state (likely the 'timer' state), show warning
      if (isActive) {
        // We popped the timer state, so we are at 'root'. 
        // Show info modal and push state again so 'Back' dismisses the info modal, not the app.
        setShowBackgroundInfo(true);
        window.history.pushState({ modal: true }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showSettings, showStats, summaryData, showBackgroundInfo, isActive]);


  // --- PWA & SW ---
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // --- Silent Audio Initialization ---
  useEffect(() => {
    const audio = new Audio(SILENT_AUDIO_URL);
    audio.loop = true;
    silentAudioRef.current = audio;
    return () => {
      audio.pause();
      silentAudioRef.current = null;
    }
  }, []);

  // Control Silent Audio Playback
  useEffect(() => {
    const audio = silentAudioRef.current;
    if (!audio) return;
    
    if (isActive) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.log('Audio autoplay prevented', e));
      }
    } else {
      audio.pause();
    }
  }, [isActive]);


  // --- Media Session & Realtime Updates ---
  const updateMediaSession = useCallback((secondsLeft: number, totalSeconds: number, currentMode: TimerMode) => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentMode === TimerMode.STUDY ? 'Work Session' : 'Break Time',
      artist: 'Focus Retro',
      album: 'Keep Going',
      artwork: [
        { src: 'https://picsum.photos/96/96', sizes: '96x96', type: 'image/png' },
        { src: 'https://picsum.photos/192/192', sizes: '192x192', type: 'image/png' },
      ]
    });

    navigator.mediaSession.setPositionState({
      duration: totalSeconds,
      playbackRate: 1.0,
      position: totalSeconds - secondsLeft
    });
  }, []);

  // --- Timer Logic ---
  const addLog = useCallback((type: 'STUDY' | 'BREAK', seconds: number) => {
    const newLog: StudyLog = {
      id: crypto.randomUUID(),
      startTime: Date.now() - (seconds * 1000),
      durationSeconds: seconds,
      type,
      timestamp: Date.now()
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const clearLogs = useCallback((scope: 'TODAY' | 'ALL') => {
    if (scope === 'ALL') {
      setLogs([]);
    } else {
      const todayKey = getDayKey(Date.now());
      setLogs(prev => prev.filter(log => getDayKey(log.timestamp) !== todayKey));
    }
  }, []);

  const persistTimerState = useCallback((currentMode: TimerMode, endTime: number) => {
    const state: TimerState = {
      mode: currentMode,
      endTime,
      pausedStudyTime: pausedStudyTimeRef.current,
      activeSessionTotalTime: activeSessionTotalTimeRef.current
    };
    localStorage.setItem(STORAGE_KEY_TIMER_STATE, JSON.stringify(state));
  }, []);

  const clearTimerState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TIMER_STATE);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIdRef.current) clearInterval(timerIdRef.current);
    timerIdRef.current = null;
    setIsActive(false);
    endTimeRef.current = null;
    clearTimerState();

    // Clear media session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }, [clearTimerState]);

  const tick = useCallback(() => {
    if (!endTimeRef.current) return;
    
    const now = Date.now();
    const diff = Math.ceil((endTimeRef.current - now) / 1000);

    if (diff <= 0) {
      setTimeLeft(0);
      completeSessionRef.current();
    } else {
      setTimeLeft(diff);
    }
  }, []);

  const startTimer = useCallback((newMode: TimerMode, explicitSeconds?: number, replaceHistory: boolean = false) => {
    requestNotificationPermission();

    const currentSettings = settingsRef.current;
    
    let durationSeconds: number;
    if (explicitSeconds !== undefined) {
      durationSeconds = explicitSeconds;
    } else {
      const durationMinutes = newMode === TimerMode.STUDY ? currentSettings.studyDuration : currentSettings.breakDuration;
      durationSeconds = durationMinutes * 60;
      
      if (newMode === TimerMode.STUDY) {
        activeSessionTotalTimeRef.current = currentSettings.studyDuration;
      }
    }
    
    setMode(newMode);
    setTimeLeft(durationSeconds);
    setIsActive(true);
    
    const endTime = Date.now() + (durationSeconds * 1000);
    endTimeRef.current = endTime;
    
    // Save state
    persistTimerState(newMode, endTime);
    
    // Manage History
    if (replaceHistory) {
        window.history.replaceState({ timer: true }, '');
    } else {
        window.history.pushState({ timer: true }, '');
    }

    // Setup Notification Actions
    const actions = newMode === TimerMode.STUDY 
      ? [{ action: 'break', title: 'Take Break' }, { action: 'stop', title: 'End Session' }]
      : [{ action: 'stop', title: 'End Session' }];
      
    sendNotification(
      newMode === TimerMode.STUDY ? "Work Mode On!" : "Break Time", 
      `Timer set for ${durationSeconds / 60} minutes.`,
      actions
    );

    // Initial Media Session Setup
    const totalDuration = newMode === TimerMode.STUDY 
      ? (activeSessionTotalTimeRef.current * 60)
      : (settingsRef.current.breakDuration * 60);

    updateMediaSession(durationSeconds, totalDuration, newMode);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
    
    if (timerIdRef.current) clearInterval(timerIdRef.current);
    timerIdRef.current = window.setInterval(tick, 1000);
  }, [tick, persistTimerState, updateMediaSession]);

  // Restore state logic
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY_TIMER_STATE);
    if (savedState) {
      try {
        const state: TimerState = JSON.parse(savedState);
        const now = Date.now();
        const diff = Math.ceil((state.endTime - now) / 1000);

        if (diff > 0) {
          setMode(state.mode);
          setTimeLeft(diff);
          setIsActive(true);
          endTimeRef.current = state.endTime;
          activeSessionTotalTimeRef.current = state.activeSessionTotalTime;
          pausedStudyTimeRef.current = state.pausedStudyTime;
          
          // Since we restored, push a state so back button works as expected
          window.history.pushState({ timer: true }, '');

          const totalDuration = state.mode === TimerMode.STUDY 
            ? (state.activeSessionTotalTime * 60)
            : (settings.breakDuration * 60);
          updateMediaSession(diff, totalDuration, state.mode);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
          
          if (timerIdRef.current) clearInterval(timerIdRef.current);
          timerIdRef.current = window.setInterval(tick, 1000);
        } else {
           // Expired logic...
          const duration = state.activeSessionTotalTime * 60;
          if (state.mode === TimerMode.STUDY) {
            addLog('STUDY', duration);
            sendNotification("Session Finished", "Your work session ended while you were away.");
          } else if (state.mode === TimerMode.BREAK) {
             sendNotification("Break Over", "Your break ended while you were away.");
          }
          clearTimerState();
          setMode(TimerMode.IDLE);
          setTimeLeft(settings.studyDuration * 60);
        }
      } catch (e) {
        console.error("Failed to restore timer state", e);
        clearTimerState();
      }
    }
  }, [addLog, clearTimerState, settings.studyDuration, tick, settings.breakDuration, updateMediaSession]);

  const completeSession = useCallback(() => {
    stopTimer();
    playAlarm();
    
    // Determine if we need to replace the current history entry (timer)
    const hasTimerState = !!window.history.state?.timer;
    
    const currentMode = modeRef.current;
    const currentSettings = settingsRef.current;

    // We prepare the action to replace the history when starting the NEXT timer.
    // This creates a flow: Timer (replaced by) -> Modal (replaced by) -> Next Timer
    // Effectively keeping the stack clean.

    if (currentMode === TimerMode.STUDY) {
      const duration = activeSessionTotalTimeRef.current * 60;
      addLog('STUDY', duration);
      sendNotification("Good Job!", `You worked for ${activeSessionTotalTimeRef.current} mins. Starting next session...`);
      pausedStudyTimeRef.current = null;
      
      // Start next study session, replace the modal history entry
      nextSessionActionRef.current = () => startTimer(TimerMode.STUDY, undefined, true);
      
      openModal(setSummaryData, { type: 'STUDY', duration: duration, finishedNaturally: true }, hasTimerState);

    } else if (currentMode === TimerMode.BREAK) {
      const duration = currentSettings.breakDuration * 60;
      addLog('BREAK', duration);
      sendNotification("Break Over", "Resuming your work session!");
      
      if (pausedStudyTimeRef.current !== null) {
         nextSessionActionRef.current = () => {
             startTimer(TimerMode.STUDY, pausedStudyTimeRef.current!, true);
             pausedStudyTimeRef.current = null;
         };
      } else {
         nextSessionActionRef.current = () => {
             startTimer(TimerMode.STUDY, undefined, true);
         };
      }

      openModal(setSummaryData, { type: 'BREAK', duration: duration, finishedNaturally: true }, hasTimerState);
    }
  }, [addLog, stopTimer, startTimer, openModal]);

  useEffect(() => {
    completeSessionRef.current = completeSession;
  }, [completeSession]);


  // --- Event Handlers & SW Message ---
  
  // This function is called when user clicks "Start Next Session" or Auto-Start triggers
  const handleNextSession = useCallback(() => {
    // 1. Execute the scheduled next action (start timer)
    if (nextSessionActionRef.current) {
        nextSessionActionRef.current();
        nextSessionActionRef.current = null;
    }
    
    // 2. Clear modal state
    setSummaryData(null);

    // NOTE: We do NOT call window.history.back() here. 
    // The `nextSessionActionRef` (startTimer) is configured to use replaceState.
    // This replaces the "Modal" history entry with the "New Timer" entry.
  }, []);

  const handleEndSession = useCallback(() => {
    // 1. Clear any pending actions
    nextSessionActionRef.current = null;

    // 2. Force close modal state immediately
    setSummaryData(null);

    // 3. Navigate back to remove the modal history entry
    window.history.back();
    
    // 4. Reset Timer State completely
    stopTimer(); // Ensure timer is stopped
    setMode(TimerMode.IDLE);
    setTimeLeft(settingsRef.current.studyDuration * 60);
    pausedStudyTimeRef.current = null;
    setIsActive(false);
    clearTimerState();
  }, [stopTimer, clearTimerState]);

  const handleStop = useCallback(() => {
    let summaryDuration = 0;
    let summaryType: 'STUDY' | 'BREAK' = 'STUDY';

    if (modeRef.current === TimerMode.STUDY) {
       const elapsedSeconds = (activeSessionTotalTimeRef.current * 60) - timeLeft;
       if (elapsedSeconds > 0) {
         addLog('STUDY', elapsedSeconds);
         summaryDuration = elapsedSeconds;
         summaryType = 'STUDY';
       }
    } else if (modeRef.current === TimerMode.BREAK) {
       // Log the paused study time if it exists
       if (pausedStudyTimeRef.current !== null) {
          const totalSeconds = activeSessionTotalTimeRef.current * 60;
          const elapsedSeconds = totalSeconds - pausedStudyTimeRef.current;
          if (elapsedSeconds > 0) {
             addLog('STUDY', elapsedSeconds);
          }
          pausedStudyTimeRef.current = null;
       }
       
       // Log the break time
       const elapsedBreak = (settingsRef.current.breakDuration * 60) - timeLeft;
       if (elapsedBreak > 0) {
          addLog('BREAK', elapsedBreak);
          summaryDuration = elapsedBreak;
          summaryType = 'BREAK';
       }
    }

    // Check if we are currently active (before stopping) to decide on history replacement
    const wasActive = isActive;
    const hasTimerState = !!window.history.state?.timer;
    const shouldReplace = wasActive || hasTimerState;

    if (summaryDuration > 0) {
       // When stopping manually, we usually don't auto-start next session
       nextSessionActionRef.current = null; 
       openModal(setSummaryData, { type: summaryType, duration: summaryDuration, finishedNaturally: false }, shouldReplace);
    } else {
       // Just stopping without summary (no duration logged or only silent background log)
       if (wasActive && hasTimerState) {
            ignoreBackWarningRef.current = true;
            window.history.back();
       }
    }

    stopTimer();
    setMode(TimerMode.IDLE);
    pausedStudyTimeRef.current = null;
    setTimeLeft(settingsRef.current.studyDuration * 60);
  }, [addLog, timeLeft, stopTimer, isActive, openModal]);

  const handleTakeBreak = useCallback(() => {
    if (modeRef.current === TimerMode.STUDY) {
       pausedStudyTimeRef.current = timeLeft;
    }
    // Replace current Study Timer history state with Break Timer state
    startTimer(TimerMode.BREAK, undefined, true);
  }, [timeLeft, startTimer]);

  const handleResumeStudy = useCallback(() => {
     // Log the break session if we are in break mode
     if (modeRef.current === TimerMode.BREAK) {
        const breakDuration = settingsRef.current.breakDuration * 60;
        const elapsedBreak = breakDuration - timeLeft;
        if (elapsedBreak > 0) {
            addLog('BREAK', elapsedBreak);
        }
     }

     stopTimer();
     // Replace current Break Timer history state with Study Timer state
     if (pausedStudyTimeRef.current !== null) {
        startTimer(TimerMode.STUDY, pausedStudyTimeRef.current, true);
        pausedStudyTimeRef.current = null;
     } else {
        startTimer(TimerMode.STUDY, undefined, true);
     }
  }, [stopTimer, startTimer, timeLeft, addLog]);

  // SW Message Listener
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const messageHandler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'STOP_TIMER') {
          handleStop();
        } else if (event.data && event.data.type === 'TAKE_BREAK') {
          handleTakeBreak();
        }
      };
      navigator.serviceWorker.addEventListener('message', messageHandler);
      return () => navigator.serviceWorker.removeEventListener('message', messageHandler);
    }
  }, [handleStop, handleTakeBreak]);

  // Ref to hold the latest handleStop so we don't rebind media session handlers constantly
  const handleStopRef = useRef(handleStop);
  useEffect(() => { handleStopRef.current = handleStop; }, [handleStop]);

  // Setup Media Session Actions (run once)
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('stop', () => {
         handleStopRef.current();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
         handleStopRef.current();
      });
    }
  }, []);

  // --- Render Handlers ---
  
  const handleInitialStart = () => {
    openModal(setShowSettings, true);
  };

  const handleSettingsSave = (study: number, brk: number) => {
    const newSettings = { ...settings, studyDuration: study, breakDuration: brk };
    setSettings(newSettings);
    settingsRef.current = newSettings;
    closeModal(setShowSettings, false);
    startTimer(TimerMode.STUDY);
  };

  const toggleTheme = () => {
    setSettings(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }));
  };

  return (
    <div 
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 relative transition-colors duration-500 ${settings.isDarkMode ? 'bg-retro-dark' : 'bg-retro-paper'}`}
    >
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center mix-blend-overlay"
        style={{ backgroundImage: `url(${settings.isDarkMode ? BG_DARK : BG_LIGHT})` }}
      />
      
      {/* Header Controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
         {deferredPrompt && (
           <button 
             onClick={handleInstallClick}
             className="p-2 bg-retro-pink border-2 border-black rounded-full shadow-retro transition-transform active:translate-y-1 font-bold text-sm px-3 animate-pulse"
           >
             Install 📲
           </button>
         )}
         <button 
          onClick={toggleTheme} 
          className={`p-2 border-2 border-black rounded-full shadow-retro transition-transform active:translate-y-1 ${settings.isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
          aria-label="Toggle Theme"
         >
           {settings.isDarkMode ? '☀️' : '🌙'}
         </button>
         <button 
          onClick={() => openModal(setShowStats, true)} 
          className="p-2 bg-retro-blue border-2 border-black rounded-full shadow-retro transition-transform active:translate-y-1"
          aria-label="Stats"
         >
           📊
         </button>
      </div>

      {/* Main Card */}
      <div className="relative z-10 bg-white border-4 border-black shadow-retro p-8 pt-10 w-full max-w-md text-center transform rotate-1 hover:rotate-0 transition-transform duration-300">
        
        <h1 className="text-6xl font-display mb-2 stroke-black text-retro-yellow" style={{ WebkitTextStroke: '2px black' }}>
          WorkSpan
        </h1>
        
        {/* Status / Quote Area */}
        <div className="min-h-[60px] mb-4 flex flex-col justify-center items-center">
          {mode === TimerMode.IDLE ? (
            <div className="bg-retro-paper border-2 border-black p-2 -rotate-1 shadow-sm max-w-xs">
              <p className="font-body italic text-sm">"{quote}"</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
               <p className="font-bold text-gray-500 uppercase tracking-widest text-xs">
                 {mode === TimerMode.STUDY ? 'Keep Grinding!' : 'Chilling Time'}
               </p>
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div className="relative flex h-3 w-3">
                    {isActive && (
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${mode === TimerMode.STUDY ? 'bg-red-500' : 'bg-green-500'}`}></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${mode === TimerMode.STUDY ? 'bg-red-500' : 'bg-green-500'}`}></span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {mode === TimerMode.STUDY ? 'Focusing' : 'Chilling'}
                  </span>
               </div>
            </div>
          )}
        </div>

        {/* Timer Display */}
        <div className="mb-6 relative flex flex-col items-center justify-center">
          {mode === TimerMode.IDLE ? (
             <button 
               onClick={() => openModal(setShowSettings, true)}
               className="group flex flex-col items-center justify-center py-4 px-8 border-2 border-transparent hover:border-black hover:bg-white hover:shadow-retro-hover rounded-lg transition-all duration-200"
               aria-label="Change Session Duration"
             >
                <div className="flex items-baseline gap-2 text-black/80 group-hover:text-black transition-colors">
                   <span className="text-8xl font-display">{settings.studyDuration}</span>
                   <span className="text-3xl font-bold text-gray-400 group-hover:text-black/60 font-body lowercase">min</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-retro-blue transition-colors">Target Duration</p>
                   <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity text-retro-blue">✏️</span>
                </div>
             </button>
          ) : (
            <div className="text-8xl font-display tabular-nums tracking-wider text-black drop-shadow-md">
              {formatTime(timeLeft)}
            </div>
          )}
          
          {isActive && (
             <div className="w-full h-4 border-2 border-black mt-4 rounded-full overflow-hidden bg-gray-200">
               <div 
                 className={`h-full transition-all duration-1000 ease-linear ${mode === TimerMode.BREAK ? 'bg-retro-green' : 'bg-retro-pink'}`}
                 style={{ 
                   width: `${(timeLeft / (
                     (mode === TimerMode.STUDY 
                        ? (activeSessionTotalTimeRef.current * 60) 
                        : (settings.breakDuration * 60))
                   )) * 100}%` 
                  }}
               />
             </div>
          )}
        </div>

        {/* Today's Stats (Idle Only) */}
        {mode === TimerMode.IDLE && (
           <div className="mb-6 flex gap-4 justify-center">
              <div className="bg-white border-2 border-black p-3 shadow-retro-hover transform -rotate-2">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Today's Work</p>
                <p className="font-display text-2xl leading-none">{formatDuration(todayStats.totalSeconds)}</p>
              </div>
              <div className="bg-white border-2 border-black p-3 shadow-retro-hover transform rotate-2">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Sessions</p>
                <p className="font-display text-2xl leading-none">{todayStats.sessions}</p>
              </div>
           </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-4">
          {mode === TimerMode.IDLE ? (
             <RetroButton onClick={handleInitialStart} className="w-full text-2xl py-4">
               START WORKING
             </RetroButton>
          ) : mode === TimerMode.BREAK ? (
            <>
              <div className="flex gap-4">
                <RetroButton 
                  onClick={handleResumeStudy} 
                  variant="success" 
                  className="flex-1"
                >
                  Resume Session
                </RetroButton>
                <RetroButton onClick={handleStop} variant="danger" className="flex-1">
                  End Session
                </RetroButton>
              </div>
              <p className="mt-4 text-xs text-gray-400 font-mono">
                Break time! Session paused.
              </p>
            </>
          ) : (
            <>
              <div className="flex gap-4">
                <RetroButton 
                  onClick={() => handleTakeBreak()} // Wrappers needed for simple calls
                  variant="success" 
                  className="flex-1"
                >
                  Take Break
                </RetroButton>
                <RetroButton onClick={handleStop} variant="danger" className="flex-1">
                  End Session
                </RetroButton>
              </div>
              <p className="mt-4 text-xs text-gray-400 font-mono">
                Session will auto-renew upon completion.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSettings && (
        <SettingsModal 
          studyTime={settings.studyDuration} 
          breakTime={settings.breakDuration}
          onSave={handleSettingsSave}
          onClose={() => closeModal(setShowSettings, false)}
        />
      )}

      {showStats && (
        <StatsBoard 
          logs={logs}
          onClose={() => closeModal(setShowStats, false)}
          onClearLogs={clearLogs}
        />
      )}

      {summaryData && (
        <SessionSummaryModal 
          type={summaryData.type}
          durationSeconds={summaryData.duration}
          onNext={handleNextSession}
          onEndSession={handleEndSession}
          // Auto start if it was a Study session, but not if it was a Break
          autoStart={summaryData.type === 'STUDY' && summaryData.finishedNaturally}
          finishedNaturally={summaryData.finishedNaturally}
        />
      )}
      
      {showBackgroundInfo && (
        <BackgroundInfoModal 
          onDismiss={() => closeModal(setShowBackgroundInfo, false)}
        />
      )}

    </div>
  );
};

export default App;