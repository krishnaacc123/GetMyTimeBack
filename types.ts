export enum TimerMode {
  IDLE = 'IDLE',
  STUDY = 'STUDY',
  BREAK = 'BREAK',
}

export interface StudyLog {
  id: string;
  startTime: number;
  durationSeconds: number; // Changed from minutes to seconds
  type: 'STUDY' | 'BREAK';
  timestamp: number;
}

export interface AppSettings {
  studyDuration: number; // in minutes
  breakDuration: number; // in minutes
  isDarkMode: boolean;
}

export interface TimerState {
  mode: TimerMode;
  endTime: number;
  pausedStudyTime: number | null;
  pausedStudyTotalTime?: number | null; // Added to persist total duration of paused study session
  activeSessionTotalTime: number; // stored in minutes for ref config, converted to seconds for calc
  currentSessionBreakTime?: number; // Added to persist cumulative break time
}