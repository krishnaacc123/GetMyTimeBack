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
import { useLanguage } from './contexts/LanguageContext';
import { LANGUAGES, LanguageCode } from './utils/translations';

// Types for background images
const BG_LIGHT = "https://picsum.photos/id/20/1920/1080"; // Notebook style
const BG_DARK = "https://picsum.photos/id/180/1920/1080"; // Laptop/Work

const App: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();

  // --- State ---
  const [mode, setMode] = useState<TimerMode>(TimerMode.IDLE);
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_STUDY_TIME * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  
  // Modals state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<{ type: 'STUDY' | 'BREAK', duration: number, studyDuration?: number, finishedNaturally: boolean } | null>(null);
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
  const workerRef = useRef<Worker | null>(null);
  const modeRef = useRef(mode);
  const settingsRef = useRef(settings);
  const completeSessionRef = useRef<() => void>(() => {});
  const pausedStudyTimeRef = useRef<number | null>(null);
  const pausedStudyTotalTimeRef = useRef<number | null>(null);
  const activeSessionTotalTimeRef = useRef<number>(DEFAULT_STUDY_TIME);
  const currentSessionBreakTimeRef = useRef<number>(0); // Track total break time for current session
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

  const deleteLog = useCallback((id: string) => {
    setLogs(prev => prev.filter(log => log.id !== id));
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
      pausedStudyTotalTime: pausedStudyTotalTimeRef.current,
      activeSessionTotalTime: activeSessionTotalTimeRef.current,
      currentSessionBreakTime: currentSessionBreakTimeRef.current,
    };
    localStorage.setItem(STORAGE_KEY_TIMER_STATE, JSON.stringify(state));
  }, []);

  const clearTimerState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TIMER_STATE);
  }, []);

  // Worker setup
  useEffect(() => {
    // Basic Web Worker to tick every second without main thread throttling
    const workerScript = `
      let intervalId;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (intervalId) clearInterval(intervalId);
          intervalId = setInterval(() => {
            self.postMessage('tick');
          }, 1000);
        } else if (e.data === 'stop') {
          if (intervalId) clearInterval(intervalId);
          intervalId = null;
        }
      };
    `;
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const stopTimer = useCallback(() => {
    // Send stop to worker
    if (workerRef.current) {
        workerRef.current.postMessage('stop');
        // Remove onmessage handler to prevent stray ticks
        workerRef.current.onmessage = null;
    }
    
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

  // Bind worker tick
  useEffect(() => {
    if (workerRef.current) {
        workerRef.current.onmessage = (e) => {
            if (e.data === 'tick') {
                tick();
            }
        };
    }
  }, [tick]);

  // Visibility change handler for instant updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick(); // Force update immediately when tab comes to foreground
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tick]);

  const startTimer = useCallback((newMode: TimerMode, explicitSeconds?: number, replaceHistory: boolean = false) => {
    requestNotificationPermission();

    const currentSettings = settingsRef.current;
    
    let durationSeconds: number;
    if (explicitSeconds !== undefined) {
      durationSeconds = explicitSeconds;
      // Note: We do NOT strictly overwrite activeSessionTotalTimeRef here when resuming.
      // It must be set correctly by the caller (handleResumeStudy) before calling startTimer with explicitSeconds.
    } else {
      const durationMinutes = newMode === TimerMode.STUDY ? currentSettings.studyDuration : currentSettings.breakDuration;
      durationSeconds = durationMinutes * 60;
      
      // Update the total session time reference for both modes
      activeSessionTotalTimeRef.current = durationMinutes;
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
    const totalDuration = activeSessionTotalTimeRef.current * 60;

    updateMediaSession(durationSeconds, totalDuration, newMode);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
    
    // Start Worker Timer
    if (workerRef.current) {
        workerRef.current.postMessage('start');
        // Re-bind handler just in case it was cleared by stopTimer
        workerRef.current.onmessage = (e) => {
            if (e.data === 'tick') {
                tick();
            }
        };
    }
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
          pausedStudyTotalTimeRef.current = state.pausedStudyTotalTime || null;
          currentSessionBreakTimeRef.current = state.currentSessionBreakTime || 0;
          
          // Since we restored, push a state so back button works as expected
          window.history.pushState({ timer: true }, '');

          const totalDuration = state.activeSessionTotalTime * 60;
          updateMediaSession(diff, totalDuration, state.mode);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
          
          // Start Worker Timer
          if (workerRef.current) {
             workerRef.current.postMessage('start');
          }
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
  }, [addLog, clearTimerState, settings.studyDuration, settings.breakDuration, updateMediaSession]);

  const completeSession = useCallback(() => {
    stopTimer();
    playAlarm();
    
    // Determine if we need to replace the current history entry (timer)
    const hasTimerState = !!window.history.state?.timer;
    
    const currentMode = modeRef.current;

    // We prepare the action to replace the history when starting the NEXT timer.
    // This creates a flow: Timer (replaced by) -> Modal (replaced by) -> Next Timer
    // Effectively keeping the stack clean.

    if (currentMode === TimerMode.STUDY) {
      const duration = activeSessionTotalTimeRef.current * 60;
      addLog('STUDY', duration);
      sendNotification("Good Job!", `You worked for ${activeSessionTotalTimeRef.current} mins. Starting next session...`);
      pausedStudyTimeRef.current = null;
      pausedStudyTotalTimeRef.current = null;

      const totalBreakTime = currentSessionBreakTimeRef.current;
      currentSessionBreakTimeRef.current = 0; // Reset break time for new session
      
      // Start next study session, replace the modal history entry
      nextSessionActionRef.current = () => startTimer(TimerMode.STUDY, undefined, true);
      
      // Show Dual View if breaks were taken
      if (totalBreakTime > 0) {
        openModal(setSummaryData, { 
            type: 'STUDY', 
            duration: totalBreakTime, // Breaks (durationSeconds prop used for break in dual view)
            studyDuration: duration, // Work
            finishedNaturally: true 
        }, hasTimerState);
      } else {
        openModal(setSummaryData, { type: 'STUDY', duration: duration, finishedNaturally: true }, hasTimerState);
      }

    } else if (currentMode === TimerMode.BREAK) {
      // Use activeSessionTotalTimeRef instead of settings to capture any +/- adjustments
      const duration = activeSessionTotalTimeRef.current * 60;
      addLog('BREAK', duration);
      currentSessionBreakTimeRef.current += duration; // Add full completed break
      
      sendNotification("Break Over", "Resuming your work session!");
      
      // Calculate any work done before this break finished
      let totalWorkTime = 0;
      if (pausedStudyTimeRef.current !== null) {
          const totalStudy = pausedStudyTotalTimeRef.current ?? settingsRef.current.studyDuration;
          totalWorkTime = (totalStudy * 60) - pausedStudyTimeRef.current;
      }

      if (pausedStudyTimeRef.current !== null) {
         nextSessionActionRef.current = () => {
             // Restore total duration correctly before resuming
             if (pausedStudyTotalTimeRef.current) {
                activeSessionTotalTimeRef.current = pausedStudyTotalTimeRef.current;
             }
             startTimer(TimerMode.STUDY, pausedStudyTimeRef.current!, true);
             pausedStudyTimeRef.current = null;
             pausedStudyTotalTimeRef.current = null;
         };
      } else {
         nextSessionActionRef.current = () => {
             currentSessionBreakTimeRef.current = 0; // Fresh session
             startTimer(TimerMode.STUDY, undefined, true);
         };
      }
      
      // For summary, we show the total accumulated break time. 
      // If work was done, show dual view.
      if (totalWorkTime > 0) {
         openModal(setSummaryData, { 
             type: 'BREAK', 
             duration: currentSessionBreakTimeRef.current, // Break
             studyDuration: totalWorkTime, // Work
             finishedNaturally: true 
         }, hasTimerState);
      } else {
         openModal(setSummaryData, { type: 'BREAK', duration: currentSessionBreakTimeRef.current, finishedNaturally: true }, hasTimerState);
      }
    }
  }, [addLog, stopTimer, startTimer, openModal, settingsRef]);

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
    pausedStudyTotalTimeRef.current = null;
    currentSessionBreakTimeRef.current = 0;
    setIsActive(false);
    clearTimerState();
  }, [stopTimer, clearTimerState]);

  const handleStop = useCallback(() => {
    let summaryDuration = 0;
    let summaryType: 'STUDY' | 'BREAK' = 'STUDY';
    let summaryStudyDuration = 0;

    if (modeRef.current === TimerMode.STUDY) {
       // Stopped manually during work
       const elapsedSeconds = (activeSessionTotalTimeRef.current * 60) - timeLeft;
       // Total work logic: (Total Projected - Time Left)
       // If we had breaks, we might want to show total break time too.
       
       if (elapsedSeconds > 0) {
         addLog('STUDY', elapsedSeconds);
         summaryDuration = elapsedSeconds;
         summaryType = 'STUDY';
         
         // If we have breaks, we should show dual view
         if (currentSessionBreakTimeRef.current > 0) {
            // In Dual view: studyDuration = Work, duration = Break
            summaryStudyDuration = elapsedSeconds;
            summaryDuration = currentSessionBreakTimeRef.current;
         }
       }
    } else if (modeRef.current === TimerMode.BREAK) {
       // Stopped manually during break
       
       // 1. Log the paused study time if it exists
       if (pausedStudyTimeRef.current !== null) {
          // Use stored total time to calculate elapsed correctly
          const totalStudy = pausedStudyTotalTimeRef.current ?? settingsRef.current.studyDuration;
          const totalSeconds = totalStudy * 60;
          const elapsedSeconds = totalSeconds - pausedStudyTimeRef.current;
          
          if (elapsedSeconds > 0) {
             addLog('STUDY', elapsedSeconds);
             summaryStudyDuration = elapsedSeconds;
          }
          pausedStudyTimeRef.current = null;
          pausedStudyTotalTimeRef.current = null;
       }
       
       // 2. Log the break time (using the adjusted total time ref)
       const elapsedBreak = (activeSessionTotalTimeRef.current * 60) - timeLeft;
       if (elapsedBreak > 0) {
          addLog('BREAK', elapsedBreak);
          currentSessionBreakTimeRef.current += elapsedBreak; // Accumulate the final chunk
          
          summaryDuration = currentSessionBreakTimeRef.current; // Show TOTAL break time
          summaryType = 'BREAK';
       }
    }

    // Check if we are currently active (before stopping) to decide on history replacement
    const wasActive = isActive;
    const hasTimerState = !!window.history.state?.timer;
    const shouldReplace = wasActive || hasTimerState;

    if (summaryDuration > 0 || summaryStudyDuration > 0) {
       // When stopping manually, we usually don't auto-start next session
       nextSessionActionRef.current = null; 
       
       openModal(setSummaryData, { 
         type: summaryType, 
         duration: summaryDuration, // Contains Break Total if Dual View, or Work/Break Single if Single View
         studyDuration: summaryStudyDuration > 0 ? summaryStudyDuration : undefined,
         finishedNaturally: false 
       }, shouldReplace);
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
    pausedStudyTotalTimeRef.current = null;
    currentSessionBreakTimeRef.current = 0;
    setTimeLeft(settingsRef.current.studyDuration * 60);
  }, [addLog, timeLeft, stopTimer, isActive, openModal]);

  const handleTakeBreak = useCallback(() => {
    if (modeRef.current === TimerMode.STUDY) {
       pausedStudyTimeRef.current = timeLeft;
       pausedStudyTotalTimeRef.current = activeSessionTotalTimeRef.current;
    }
    // Replace current Study Timer history state with Break Timer state
    startTimer(TimerMode.BREAK, undefined, true);
  }, [timeLeft, startTimer]);

  const handleResumeStudy = useCallback(() => {
     // Log the break session if we are in break mode
     if (modeRef.current === TimerMode.BREAK) {
        // Use adjusted total time to calculate elapsed
        const breakDuration = activeSessionTotalTimeRef.current * 60;
        const elapsedBreak = breakDuration - timeLeft;
        if (elapsedBreak > 0) {
            addLog('BREAK', elapsedBreak);
            currentSessionBreakTimeRef.current += elapsedBreak; // Accumulate
        }
     }

     stopTimer();
     // Replace current Break Timer history state with Study Timer state
     if (pausedStudyTimeRef.current !== null) {
        if (pausedStudyTotalTimeRef.current) {
            activeSessionTotalTimeRef.current = pausedStudyTotalTimeRef.current;
        }
        startTimer(TimerMode.STUDY, pausedStudyTimeRef.current, true);
        pausedStudyTimeRef.current = null;
        pausedStudyTotalTimeRef.current = null;
     } else {
        // Should effectively never happen in 'Resume' context without paused time, but handle as fresh
        startTimer(TimerMode.STUDY, undefined, true);
     }
  }, [stopTimer, startTimer, timeLeft, addLog]);

  const adjustTimer = useCallback((minutes: number) => {
    if (!endTimeRef.current || mode !== TimerMode.BREAK) return;
    
    const adjustmentMs = minutes * 60 * 1000;
    const newEndTime = endTimeRef.current + adjustmentMs;
    const now = Date.now();
    
    // Update the total duration ref so stats/progress are correct
    activeSessionTotalTimeRef.current += minutes;

    // If new end time is in the past, or very close to now, set to 0 (finish immediately)
    if (newEndTime <= now) {
        endTimeRef.current = now;
        setTimeLeft(0);
    } else {
        endTimeRef.current = newEndTime;
        setTimeLeft(Math.ceil((newEndTime - now) / 1000));
    }
    
    persistTimerState(mode, endTimeRef.current);
    
    // Update media session metadata
    const totalDuration = activeSessionTotalTimeRef.current * 60;
    const currentLeft = Math.max(0, Math.ceil((newEndTime - now) / 1000));
    updateMediaSession(currentLeft, totalDuration, mode);

  }, [mode, persistTimerState, updateMediaSession]);

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
    currentSessionBreakTimeRef.current = 0; // Reset for fresh session
    startTimer(TimerMode.STUDY);
  };

  const handleSettingsSave = (study: number, brk: number) => {
    const newSettings = { ...settings, studyDuration: study, breakDuration: brk };
    setSettings(newSettings);
    settingsRef.current = newSettings;
    closeModal(setShowSettings, false);
    // If not active, update the time display
    if (!isActive && mode === TimerMode.IDLE) {
      setTimeLeft(study * 60);
    }
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
      <div className="absolute top-4 right-4 z-20 flex flex-wrap justify-end gap-2">
         {/* Language Selector */}
         <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className={`appearance-none p-2 pr-8 border-2 border-black rounded-full shadow-retro transition-transform active:translate-y-1 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-retro-blue cursor-pointer ${settings.isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
              aria-label="Select Language"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="text-black bg-white">
                  {lang.label}
                </option>
              ))}
            </select>
            <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 ${settings.isDarkMode ? 'text-black' : 'text-white'}`}>
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
         </div>

         <button 
          onClick={toggleTheme} 
          className={`p-2 border-2 border-black rounded-full shadow-retro transition-transform active:translate-y-1 focus:outline-none focus:ring-4 focus:ring-retro-blue ${settings.isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
          aria-label={t('toggleTheme')}
         >
           {settings.isDarkMode ? '☀️' : '🌙'}
         </button>
         <button 
          onClick={() => openModal(setShowStats, true)} 
          className="p-2 bg-retro-blue border-2 border-black rounded-full shadow-retro transition-transform active:translate-y-1 focus:outline-none focus:ring-4 focus:ring-black"
          aria-label={t('viewStats')}
         >
           📊
         </button>
      </div>

      {/* Main Card */}
      <div className="relative z-10 bg-white border-4 border-black shadow-retro p-8 pt-10 w-full max-w-md text-center transform rotate-1 hover:rotate-0 transition-transform duration-300">
        
        <h1 className="text-6xl font-display mb-2 stroke-black text-retro-yellow" style={{ WebkitTextStroke: '2px black' }}>
          {t('title')}
        </h1>
        
        {/* Status / Quote Area */}
        <div className="min-h-[60px] mb-4 flex flex-col justify-center items-center">
          {mode === TimerMode.IDLE ? (
            <div className="bg-retro-paper border-2 border-black p-2 -rotate-1 shadow-sm max-w-xs">
              <p className="font-body italic text-sm">"{quote}"</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
               <p className="font-bold text-gray-500 uppercase tracking-widest text-sm">
                 {mode === TimerMode.STUDY ? t('keepGrinding') : t('chillingTime')}
               </p>
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div className="relative flex h-3 w-3">
                    {isActive && (
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${mode === TimerMode.STUDY ? 'bg-red-500' : 'bg-green-500'}`}></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${mode === TimerMode.STUDY ? 'bg-red-500' : 'bg-green-500'}`}></span>
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wider">
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
                 openModal(setShowSettings, true);
               }}
               className="group flex flex-col items-center justify-center py-4 px-8 border-2 border-transparent hover:border-black hover:bg-white hover:shadow-retro-hover rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-retro-blue focus:border-black"
               aria-label={`Current target duration is ${settings.studyDuration} minutes. Click to edit.`}
             >
                <div className="flex items-baseline gap-2 text-black/80 group-hover:text-black transition-colors">
                   <span className="text-8xl font-display">{settings.studyDuration}</span>
                   <span className="text-3xl font-bold text-gray-400 group-hover:text-black/60 font-body lowercase">min</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-sm font-bold uppercase tracking-widest text-gray-400 group-hover:text-retro-blue transition-colors">{t('targetDuration')}</p>
                   <span className="text-sm text-retro-blue">✏️</span>
                </div>
             </button>
          ) : (
            <div className="flex items-center justify-center gap-6">
               {mode === TimerMode.BREAK && (
                  <button 
                    onClick={() => adjustTimer(-5)}
                    className="w-12 h-12 rounded-full border-2 border-black bg-white shadow-retro flex items-center justify-center hover:bg-red-100 active:translate-y-1 transition-all font-bold text-sm focus:outline-none focus:ring-4 focus:ring-retro-blue"
                    aria-label="Remove 5 minutes from timer"
                  >
                    -5m
                  </button>
               )}
               
               <div className="w-[340px] text-center">
                   <div className="text-8xl font-display tabular-nums tracking-wider text-black drop-shadow-md" aria-label={`${Math.floor(timeLeft / 60)} minutes and ${timeLeft % 60} seconds remaining`}>
                     {formatTime(timeLeft)}
                   </div>
               </div>

               {mode === TimerMode.BREAK && (
                  <button 
                    onClick={() => adjustTimer(5)}
                    className="w-12 h-12 rounded-full border-2 border-black bg-white shadow-retro flex items-center justify-center hover:bg-green-100 active:translate-y-1 transition-all font-bold text-sm focus:outline-none focus:ring-4 focus:ring-retro-blue"
                    aria-label="Add 5 minutes to timer"
                  >
                    +5m
                  </button>
               )}
            </div>
          )}
          
          {isActive && (
             <div 
               role="progressbar" 
               aria-valuenow={Math.min(100, (timeLeft / (activeSessionTotalTimeRef.current * 60)) * 100)} 
               aria-valuemin={0} 
               aria-valuemax={100}
               aria-label="Session Progress"
               className="w-full h-4 border-2 border-black mt-4 rounded-full overflow-hidden bg-gray-200"
             >
               <div 
                 className={`h-full transition-all duration-1000 ease-linear ${mode === TimerMode.BREAK ? 'bg-retro-green' : 'bg-retro-pink'}`}
                 style={{ 
                   width: `${Math.min(100, (timeLeft / (activeSessionTotalTimeRef.current * 60)) * 100)}%` 
                  }}
               />
             </div>
          )}
        </div>

        {/* Today's Stats (Idle Only) */}
        {mode === TimerMode.IDLE && (
           <div className="mb-6 flex gap-4 justify-center">
              <div className="bg-white border-2 border-black p-3 shadow-retro-hover transform -rotate-2">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mb-1">{t('workToday')}</p>
                <p className="font-display text-2xl leading-none">{formatDuration(todayStats.totalSeconds)}</p>
              </div>
              <div className="bg-white border-2 border-black p-3 shadow-retro-hover transform rotate-2">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mb-1">{t('sessions')}</p>
                <p className="font-display text-2xl leading-none">{todayStats.sessions}</p>
              </div>
           </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-4">
          {mode === TimerMode.IDLE ? (
             <RetroButton onClick={handleInitialStart} className="w-full text-2xl py-4">
               {t('startWorking')}
             </RetroButton>
          ) : mode === TimerMode.BREAK ? (
            <>
              <div className="flex gap-4">
                <RetroButton 
                  onClick={handleResumeStudy} 
                  variant="success" 
                  className="flex-1"
                >
                  {t('resumeSession')}
                </RetroButton>
                <RetroButton onClick={handleStop} variant="danger" className="flex-1">
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
                  onClick={() => handleTakeBreak()} // Wrappers needed for simple calls
                  variant="success" 
                  className="flex-1"
                >
                  {t('takeBreak')}
                </RetroButton>
                <RetroButton onClick={handleStop} variant="danger" className="flex-1">
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

      {/* Footer */}
      <footer className="mt-8 relative z-10 text-center flex items-center justify-center gap-1">
        <span className={`font-body text-xs font-bold ${settings.isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Made with ❤️ by Krishna
        </span>
        <a 
          href="https://github.com/krishnaacc123" 
          target="_blank" 
          rel="noopener noreferrer"
          className={`font-body text-xs font-bold transition-colors ${settings.isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
          aria-label="GitHub Profile"
        >
          🔗
        </a>
      </footer>

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
          onDeleteLog={deleteLog}
        />
      )}

      {summaryData && (
        <SessionSummaryModal 
          type={summaryData.type}
          durationSeconds={summaryData.duration}
          studyDuration={summaryData.studyDuration}
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