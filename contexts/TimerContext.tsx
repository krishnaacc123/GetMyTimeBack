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
            url = drawFaviconFallback(workerTimeLeft, currentSegmentDurationRef.current, modeRef.current);
            isBlob = false;
        }

        if (url) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = url;

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
      pausedStudyTime: pausedRemainingTimeRef.current,
      activeSessionTotalTime: currentSegmentDurationRef.current,
      currentSessionBreakTime: 0, 
      pendingLogs: [],
      currentSessionId: currentSessionIdRef.current
    };
    localStorage.setItem(STORAGE_KEY_TIMER_STATE, JSON.stringify(state));
  }, []);

  const clearTimerState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TIMER_STATE);
  }, []);

  // --- Persistence Effect ---
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
          
          currentSegmentDurationRef.current = state.activeSessionTotalTime || (settings.studyDuration * 60);
          pausedRemainingTimeRef.current = state.pausedStudyTime;
          
          if (state.currentSessionId) setCurrentSessionId(state.currentSessionId);

          if (workerRef.current) {
             workerRef.current.postMessage({ 
                 command: 'START', 
                 duration: state.remainingTime,
                 mode: state.mode,
                 totalDuration: currentSegmentDurationRef.current 
             });
          }
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

    if (workerRef.current) {
        workerRef.current.postMessage({ 
            command: 'START', 
            duration: durationSeconds,
            mode: newMode,
            totalDuration: durationSeconds
        });
    }

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
    if (workerRef.current) {
        workerRef.current.postMessage({ command: 'STOP' });
    }
    stopBackgroundSilence();
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) link.href = DEFAULT_FAVICON_HREF;
    if (faviconUrlRef.current) {
        URL.revokeObjectURL(faviconUrlRef.current);
        faviconUrlRef.current = null;
    }
  }, [clearTimerState]);

  // --- Completion Logic ---
  const completeSession = useCallback(() => {
    stopSession();
    if (settingsRef.current.soundEnabled) playAlarm();
    
    const currentMode = modeRef.current;
    const duration = currentSegmentDurationRef.current; 
    
    addLog(
        currentMode === TimerMode.STUDY ? 'STUDY' : 'BREAK', 
        duration, 
        Date.now(), 
        currentSessionIdRef.current,
        false
    );

    if (currentMode === TimerMode.STUDY) {
        sessionTotalStudyRef.current += duration;
        nextSessionActionRef.current = () => internalStartTimer(TimerMode.STUDY, undefined, true);
        pausedRemainingTimeRef.current = null;
        setSummaryData({
            type: 'STUDY',
            duration: duration, 
            studyDuration: sessionTotalStudyRef.current,
            finishedNaturally: true
        });
    } else {
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
        const elapsed = currentSegmentDurationRef.current - timeLeft;
        if (elapsed > 0) {
            addLog('STUDY', elapsed, Date.now(), currentSessionIdRef.current, false);
            sessionTotalStudyRef.current += elapsed;
        }
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
        internalStartTimer(TimerMode.STUDY, pausedRemainingTimeRef.current, true);
        pausedRemainingTimeRef.current = null;
    } else {
        internalStartTimer(TimerMode.STUDY, undefined, true);
    }
  }, [timeLeft, internalStartTimer, stopSession, addLog]);

  const endSessionAndLog = useCallback(() => {
    const elapsed = currentSegmentDurationRef.current - timeLeft;
    if (elapsed > 0) {
        addLog(
            modeRef.current === TimerMode.STUDY ? 'STUDY' : 'BREAK', 
            elapsed, 
            Date.now(), 
            currentSessionIdRef.current,
            false
        );
        if (modeRef.current === TimerMode.STUDY) {
            sessionTotalStudyRef.current += elapsed;
        } else {
            sessionTotalBreakRef.current += elapsed;
        }
    }

    setSummaryData({
        type: 'STUDY',
        duration: sessionTotalBreakRef.current,
        studyDuration: sessionTotalStudyRef.current,
        finishedNaturally: false
    });

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
      if (!event.state?.timer && isActive) endSessionAndLog();
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