

export enum TimerMode {
  IDLE = 'IDLE',
  STUDY = 'STUDY',
  BREAK = 'BREAK',
}

export interface StudyLog {
  id: string;
  sessionId?: string; // New field for grouping
  startTime: number;
  durationSeconds: number;
  type: 'STUDY' | 'BREAK';
  timestamp: number;
  isManual?: boolean;
}

export interface PendingLog {
  type: 'STUDY' | 'BREAK';
  duration: number;
  endTime: number;
  sessionId?: string;
}

export interface AppSettings {
  studyDuration: number; // in minutes
  breakDuration: number; // in minutes
  isDarkMode: boolean;
  soundEnabled: boolean;
}

export interface TimerState {
  mode: TimerMode;
  remainingTime: number;
  pausedStudyTime: number | null;
  pausedStudyTotalTime?: number | null;
  activeSessionTotalTime: number; 
  currentSessionBreakTime?: number;
  pendingLogs: PendingLog[];
  currentSessionId?: string; // Persist current session ID
}

export interface SummaryData {
  type: 'STUDY' | 'BREAK';
  duration: number;
  studyDuration?: number;
  finishedNaturally: boolean;
  breakStartTime?: number;
  initialBreakDuration?: number;
}