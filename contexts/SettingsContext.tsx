import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { AppSettings } from '../types';
import { DEFAULT_STUDY_TIME, DEFAULT_BREAK_TIME, STORAGE_KEY_SETTINGS } from '../constants';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (studyDuration: number, breakDuration: number, soundEnabled: boolean) => void;
  toggleTheme: () => void;
  toggleSound: () => void;
  importSettings: (newSettings: AppSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (saved) {
        const parsed = JSON.parse(saved);
        return {
          studyDuration: parsed.studyDuration ?? DEFAULT_STUDY_TIME,
          breakDuration: parsed.breakDuration ?? DEFAULT_BREAK_TIME,
          isDarkMode: false, // Force Light Mode for Retro Theme
          soundEnabled: parsed.soundEnabled ?? false
        };
    }
    
    return {
      studyDuration: DEFAULT_STUDY_TIME,
      breakDuration: DEFAULT_BREAK_TIME,
      isDarkMode: false,
      soundEnabled: false
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    // Always remove 'dark' class to enforce retro theme
    document.documentElement.classList.remove('dark');
  }, [settings]);

  const updateSettings = useCallback((studyDuration: number, breakDuration: number, soundEnabled: boolean) => {
    setSettings(prev => ({ ...prev, studyDuration, breakDuration, soundEnabled }));
  }, []);

  const toggleTheme = useCallback(() => {
    // Disabled for now to preserve identity
    // setSettings(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }));
  }, []);

  const toggleSound = useCallback(() => {
    setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  const importSettings = useCallback((newSettings: AppSettings) => {
      setSettings(newSettings);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, toggleTheme, toggleSound, importSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};