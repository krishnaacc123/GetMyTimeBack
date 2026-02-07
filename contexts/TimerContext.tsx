import React, { createContext, useState, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { TimerMode, TimerState, SummaryData } from '../types';
import { DEFAULT_STUDY_TIME, STORAGE_KEY_TIMER_STATE, DEFAULT_FAVICON_HREF } from '../constants';
import { playAlarm, startBackgroundSilence, stopBackgroundSilence } from '../services/sound';
import { useSettings } from './SettingsContext';
import { useLogs } from './LogsContext';
import { createTimerWorker } from '../utils/timerWorker';
import { drawFaviconFallback } from '../utils/favicon';

interface TimerContextType {
  mode: TimerMode;
  timeLeft: number;
  isActive: boolean;
  totalDuration: number; // For progress bar (current segment total)
  summaryData: SummaryData | null;
  pausedTimeLeft: number | null; // Expose paused time
  startSession: () => void;
  stopSession: () => void;
  takeBreak: () => void;
  resumeSession: () => void;
  endSessionAndLog: () => void;
  handleNextSession: () => void;
  clearSummary: () => void;
  finishBreakOvertime: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const { addLog } = useLogs();

  // --- State ---
  const [mode, setMode] = useState<TimerMode>(TimerMode.IDLE);
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_STUDY_TIME * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  
  // Session Identity
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);

  // --- Refs ---
  const modeRef = useRef(mode);
  const settingsRef = useRef(settings);
  const completeSessionRef = useRef<() => void>(() => {});
  const currentSessionIdRef = useRef<string | undefined>(currentSessionId);
  const overtimeProcessedRef = useRef(false); // Guard against double logging
  
  // Track current running segment duration for progress bar and elapsed calc
  const currentSegmentDurationRef = useRef<number>(DEFAULT_STUDY_TIME * 60);
  
  // Track paused state for resuming: store the seconds REMAINING when paused
  const pausedRemainingTimeRef = useRef<number | null>(null);

  // Web Worker Ref
  const workerRef = useRef<Worker | null>(null);
  
  // Favicon Blob URL Ref (to revoke)
  const faviconUrlRef = useRef<string | null>(null);

  // Track session totals for Summary Modal (since we log incrementally now)
  const sessionTotalStudyRef = useRef<number>(0);
  const sessionTotalBreakRef = useRef<number>(0);
  
  const nextSessionActionRef = useRef<(() => void) | null>(null);

  // Sync refs
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);

  // --- Worker Initialization ---
  useEffect(() => {
    const worker = createTimerWorker();
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, timeLeft: workerTimeLeft, faviconBlob } = e.data;

      if (type === 'TICK') {
        setTimeLeft(workerTimeLeft);
        
        // Handle Favicon Update
        let url: string | null = null;
        let isBlob = false;

        if (faviconBlob) {
            // Worker provided blob (OffscreenCanvas supported)
            url = URL.createObjectURL(faviconBlob);
            isBlob = true;
        } else {
            // Fallback: Generate on Main Thread (for Safari/Mobile support)
            // This runs on every tick if worker fails, which is fine as it ensures it works.
            url = drawFaviconFallback(workerTimeLeft, currentSegmentDurationRef.current, modeRef.current);
            isBlob = false;
        }

        if (url) {
            // Find existing link
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            
            // Update href
            link.href = url;

            // Cleanup old URL to prevent memory leaks ONLY if it was a blob we created
            if (faviconUrlRef.current) {
                URL.revokeObjectURL(faviconUrlRef.current);
                faviconUrlRef.current = null;
            }
            
            if (isBlob) {
                faviconUrlRef.current = url;
            }
        }

      } else if (type === 'COMPLETE') {
        setTimeLeft(0);
        // Execute completion in next tick to avoid state update collision
        setTimeout(() => completeSessionRef.current(), 0);
      }
    };

    return () => {
      worker.terminate();
      if (faviconUrlRef.current) URL.revokeObjectURL(faviconUrlRef.current);
    };
  }, []);

  // --- Persistence ---
  const persistTimerState = useCallback((currentMode: TimerMode, remaining: number) => {
    const state: TimerState = {
      mode: currentMode,
      remainingTime: remaining,
      pausedStudyTime: pausedRemainingTimeRef.current, // Use to store remainder
      activeSessionTotalTime: currentSegmentDurationRef.current, // Storing SECONDS now
      
      currentSessionBreakTime: 0, // Unused in new logic
      pendingLogs: [], // No longer used
      currentSessionId: currentSessionIdRef.current
    };
    localStorage.setItem(STORAGE_KEY_TIMER_STATE, JSON.stringify(state));
  }, []);

  const clearTimerState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TIMER_STATE);
  }, []);

  // --- Persistence Effect ---
  // We still use an effect to persist state periodically, 
  // but now it's reactive to the updates coming from the worker
  useEffect(() => {
    if (isActive) {
        persistTimerState(mode, timeLeft);
    }
  }, [isActive, mode, timeLeft, persistTimerState]);

  // --- Restore ---
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY_TIMER_STATE);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.remainingTime > 0) {
          setMode(state.mode);
          setTimeLeft(state.remainingTime);
          setIsActive(true);
          
          // Restore segment duration (stored as seconds now)
          currentSegmentDurationRef.current = state.activeSessionTotalTime || (settings.studyDuration * 60);
          pausedRemainingTimeRef.current = state.pausedStudyTime;
          
          if (state.currentSessionId) {
              setCurrentSessionId(state.currentSessionId);
          }

          // RESTART THE WORKER with the restored time
          if (workerRef.current) {
             workerRef.current.postMessage({ 
                 command: 'START', 
                 duration: state.remainingTime,
                 mode: state.mode,
                 totalDuration: currentSegmentDurationRef.current 
             });
          }
          
          // Restart background silence if we are restoring an active session
          // Note: Browser might block this until user interaction, but it's worth trying
          startBackgroundSilence();

          window.history.pushState({ timer: true }, '');
        } else {
          clearTimerState();
          setMode(TimerMode.IDLE);
          setTimeLeft(settings.studyDuration * 60);
        }
      } catch (e) {
        console.error("Failed to restore timer state", e);
        clearTimerState();
      }
    }
  }, [settings.studyDuration, clearTimerState]); 

  // --- Internal Start ---
  const internalStartTimer = useCallback((newMode: TimerMode, explicitSeconds?: number, replaceHistory: boolean = false) => {
    const currentSettings = settingsRef.current;
    
    let durationSeconds: number;
    if (explicitSeconds !== undefined) {
      durationSeconds = explicitSeconds;
    } else {
      const durationMinutes = newMode === TimerMode.STUDY ? currentSettings.studyDuration : currentSettings.breakDuration;
      durationSeconds = durationMinutes * 60;
    }
    
    currentSegmentDurationRef.current = durationSeconds;
    
    setMode(newMode);
    setTimeLeft(durationSeconds);
    setIsActive(true);

    // Start Worker
    if (workerRef.current) {
        workerRef.current.postMessage({ 
            command: 'START', 
            duration: durationSeconds,
            mode: newMode,
            totalDuration: durationSeconds
        });
    }

    // Start Anti-Throttling Silence
    startBackgroundSilence();
    
    if (replaceHistory) {
        window.history.replaceState({ timer: true }, '');
    } else {
        window.history.pushState({ timer: true }, '');
    }
  }, []);

  const stopSession = useCallback(() => {
    setIsActive(false);
    clearTimerState();
    
    // Stop Worker
    if (workerRef.current) {
        workerRef.current.postMessage({ command: 'STOP' });
    }
    
    // Stop Anti-Throttling Silence
    stopBackgroundSilence();
    
    // Reset Favicon to Default
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
        link.href = DEFAULT_FAVICON_HREF;
    }
    
    // Cleanup old URL if it exists
    if (faviconUrlRef.current) {
        URL.revokeObjectURL(faviconUrlRef.current);
        faviconUrlRef.current = null;
    }
    
  }, [clearTimerState]);

  // --- Completion Logic ---
  const completeSession = useCallback(() => {
    stopSession();
    
    if (settingsRef.current.soundEnabled) {
      playAlarm();
    }
    
    const currentMode = modeRef.current;
    
    // Log the completed segment
    const duration = currentSegmentDurationRef.current; 
    
    addLog(
        currentMode === TimerMode.STUDY ? 'STUDY' : 'BREAK', 
        duration, 
        Date.now(), 
        currentSessionIdRef.current
    );

    // Update session totals
    if (currentMode === TimerMode.STUDY) {
        sessionTotalStudyRef.current += duration;
        
        // Auto-renew study -> study
        nextSessionActionRef.current = () => internalStartTimer(TimerMode.STUDY, undefined, true);
        
        // Reset paused state since we finished
        pausedRemainingTimeRef.current = null;

        setSummaryData({
            type: 'STUDY',
            duration: duration, 
            studyDuration: sessionTotalStudyRef.current,
            finishedNaturally: true
        });

    } else {
        // BREAK
        sessionTotalBreakRef.current += duration;
        
        if (pausedRemainingTimeRef.current !== null) {
            const remainder = pausedRemainingTimeRef.current;
            nextSessionActionRef.current = () => {
                internalStartTimer(TimerMode.STUDY, remainder, true);
                pausedRemainingTimeRef.current = null;
            };
        } else {
            nextSessionActionRef.current = () => {
                internalStartTimer(TimerMode.STUDY, undefined, true);
            };
        }

        overtimeProcessedRef.current = false;
        setSummaryData({
            type: 'BREAK',
            duration: sessionTotalBreakRef.current,
            studyDuration: sessionTotalStudyRef.current,
            finishedNaturally: true,
            breakStartTime: Date.now(),
            initialBreakDuration: sessionTotalBreakRef.current
        });
    }
  }, [addLog, stopSession, internalStartTimer]);

  useEffect(() => {
    completeSessionRef.current = completeSession;
  }, [completeSession]);

  // --- Public Actions ---

  const startSession = useCallback(() => {
    setCurrentSessionId(crypto.randomUUID());
    sessionTotalStudyRef.current = 0;
    sessionTotalBreakRef.current = 0;
    pausedRemainingTimeRef.current = null;
    
    internalStartTimer(TimerMode.STUDY);
  }, [internalStartTimer]);

  const takeBreak = useCallback(() => {
    if (modeRef.current === TimerMode.STUDY) {
        // Calculate elapsed time for this segment
        const elapsed = currentSegmentDurationRef.current - timeLeft;
        if (elapsed > 0) {
            addLog('STUDY', elapsed, Date.now(), currentSessionIdRef.current);
            sessionTotalStudyRef.current += elapsed;
        }
        
        // Store remaining time to resume later
        pausedRemainingTimeRef.current = timeLeft;
    }
    internalStartTimer(TimerMode.BREAK, undefined, true);
  }, [timeLeft, internalStartTimer, addLog]);

  const resumeSession = useCallback(() => {
    if (modeRef.current === TimerMode.BREAK) {
        const elapsed = currentSegmentDurationRef.current - timeLeft;
        if (elapsed > 0) {
            addLog('BREAK', elapsed, Date.now(), currentSessionIdRef.current);
            sessionTotalBreakRef.current += elapsed;
        }
    }

    stopSession();

    if (pausedRemainingTimeRef.current !== null) {
        // Resume remaining study time
        internalStartTimer(TimerMode.STUDY, pausedRemainingTimeRef.current, true);
        pausedRemainingTimeRef.current = null;
    } else {
        // Start fresh
        internalStartTimer(TimerMode.STUDY, undefined, true);
    }
  }, [timeLeft, internalStartTimer, stopSession, addLog]);

  const endSessionAndLog = useCallback(() => {
    // Log whatever happened in current segment
    const elapsed = currentSegmentDurationRef.current - timeLeft;
    if (elapsed > 0) {
        addLog(
            modeRef.current === TimerMode.STUDY ? 'STUDY' : 'BREAK', 
            elapsed, 
            Date.now(), 
            currentSessionIdRef.current
        );
        if (modeRef.current === TimerMode.STUDY) {
            sessionTotalStudyRef.current += elapsed;
        } else {
            sessionTotalBreakRef.current += elapsed;
        }
    }

    setSummaryData({
        type: 'STUDY', // Just generic completion
        duration: sessionTotalBreakRef.current,
        studyDuration: sessionTotalStudyRef.current,
        finishedNaturally: false
    });

    // Cleanup
    setCurrentSessionId(undefined);
    stopSession();
    setMode(TimerMode.IDLE);
    setTimeLeft(settingsRef.current.studyDuration * 60);
    pausedRemainingTimeRef.current = null;
    clearTimerState();
  }, [timeLeft, stopSession, addLog, clearTimerState, settings.studyDuration]);

  const handleNextSession = useCallback(() => {
     if (summaryData?.breakStartTime && !overtimeProcessedRef.current) {
         overtimeProcessedRef.current = true;
         const overtime = Math.floor((Date.now() - summaryData.breakStartTime) / 1000);
         if (overtime > 0) {
             addLog('BREAK', overtime, Date.now(), currentSessionIdRef.current);
             sessionTotalBreakRef.current += overtime;
         }
     }

     if (nextSessionActionRef.current) {
         nextSessionActionRef.current();
         nextSessionActionRef.current = null;
     }
     setSummaryData(null);
  }, [summaryData, addLog]);

  const clearSummary = useCallback(() => {
     if (summaryData?.breakStartTime && !overtimeProcessedRef.current) {
         overtimeProcessedRef.current = true;
         const overtime = Math.floor((Date.now() - summaryData.breakStartTime) / 1000);
         if (overtime > 0) {
             addLog('BREAK', overtime, Date.now(), currentSessionIdRef.current);
             sessionTotalBreakRef.current += overtime;
         }
     }
     
     setSummaryData(null);
     nextSessionActionRef.current = null;
     setCurrentSessionId(undefined);
     stopSession();
     setMode(TimerMode.IDLE);
     setTimeLeft(settingsRef.current.studyDuration * 60);
     pausedRemainingTimeRef.current = null;
     setIsActive(false);
     clearTimerState();
  }, [summaryData, addLog, stopSession, clearTimerState, settings.studyDuration]);

  const finishBreakOvertime = useCallback(() => {
      if (summaryData?.breakStartTime && !overtimeProcessedRef.current) {
         overtimeProcessedRef.current = true;
         const overtime = Math.floor((Date.now() - summaryData.breakStartTime) / 1000);
         if (overtime > 0) {
             addLog('BREAK', overtime, Date.now(), currentSessionIdRef.current);
             sessionTotalBreakRef.current += overtime;
         }
         
         setSummaryData(prev => prev ? ({
             ...prev,
             finishedNaturally: false,
             duration: sessionTotalBreakRef.current,
             breakStartTime: undefined
         }) : null);
      }
  }, [summaryData, addLog]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!event.state?.timer && isActive) {
        endSessionAndLog();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isActive, endSessionAndLog]);

  return (
    <TimerContext.Provider value={{
        mode, timeLeft, isActive, summaryData,
        pausedTimeLeft: pausedRemainingTimeRef.current,
        totalDuration: currentSegmentDurationRef.current,
        startSession, stopSession, takeBreak, resumeSession, endSessionAndLog,
        handleNextSession, clearSummary, finishBreakOvertime
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};