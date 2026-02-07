import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { StudyLog } from '../types';
import { STORAGE_KEY_LOGS } from '../constants';
import { getDayKey } from '../utils/time';

interface TodayStats {
  totalSeconds: number;
  sessions: number;
}

interface LogsContextType {
  logs: StudyLog[];
  todayStats: TodayStats;
  addLog: (type: 'STUDY' | 'BREAK', seconds: number, endTime?: number, sessionId?: string, isManual?: boolean) => void;
  deleteLog: (id: string) => void;
  clearLogs: (scope: 'TODAY' | 'ALL') => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export const LogsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<StudyLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LOGS);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }, [logs]);

  const todayStats = useMemo(() => {
    const todayKey = getDayKey(Date.now());
    const todayStudyLogs = logs.filter(l => l.type === 'STUDY' && getDayKey(l.timestamp) === todayKey);
    
    const totalSeconds = todayStudyLogs.reduce((acc, log) => {
      // Handle legacy data structure if present
      const duration = log.durationSeconds ?? ((log as any).durationMinutes * 60) ?? 0;
      return acc + duration;
    }, 0);

    // Count unique sessions for accurate count (grouping segments)
    const uniqueSessions = new Set<string>();
    let legacyCount = 0;
    
    todayStudyLogs.forEach(log => {
        if (log.sessionId) {
            uniqueSessions.add(log.sessionId);
        } else {
            legacyCount++;
        }
    });

    return {
      totalSeconds,
      sessions: uniqueSessions.size + legacyCount
    };
  }, [logs]);

  const addLog = useCallback((type: 'STUDY' | 'BREAK', seconds: number, endTime?: number, sessionId?: string, isManual?: boolean) => {
    const timestamp = endTime || Date.now();
    const newLog: StudyLog = {
      id: crypto.randomUUID(),
      sessionId: sessionId,
      startTime: timestamp - (seconds * 1000),
      durationSeconds: seconds,
      type,
      timestamp: timestamp,
      isManual: isManual || false
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

  return (
    <LogsContext.Provider value={{ logs, todayStats, addLog, deleteLog, clearLogs }}>
      {children}
    </LogsContext.Provider>
  );
};

export const useLogs = () => {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error('useLogs must be used within a LogsProvider');
  }
  return context;
};