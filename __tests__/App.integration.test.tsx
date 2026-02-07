import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import App from '../App';
import { LanguageProvider } from '../contexts/LanguageContext';

// --- Mocks ---
const AudioMock = vi.fn(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  loop: false,
}));
vi.stubGlobal('Audio', AudioMock);

// Mock Navigator APIs
Object.defineProperty(navigator, 'mediaSession', {
  value: {
    metadata: null,
    setPositionState: vi.fn(),
    setActionHandler: vi.fn(),
    playbackState: 'none',
  },
  writable: true,
});

// Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Recharts for StatsBoard in integration test (if rendered)
vi.mock('recharts', () => { 
    return { 
        ResponsiveContainer: ({ children }: any) => <div>{children}</div>, 
        BarChart: () => <div>BarChart</div>, 
        Bar: () => null, 
        XAxis: () => null, 
        YAxis: () => null, 
        Tooltip: () => null, 
        Legend: () => null 
    }; 
});

describe('App Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const renderApp = () => {
    return render(
      <LanguageProvider>
        <App />
      </LanguageProvider>
    );
  };

  it('renders the initial idle state correctly', () => {
    const { getByText } = renderApp();
    expect(getByText('GetMyTimeBack')).toBeInTheDocument();
    expect(getByText('START WORKING')).toBeInTheDocument();
    // Default 25 min = 25:00
    expect(getByText('25')).toBeInTheDocument(); 
    expect(getByText('min')).toBeInTheDocument();
  });

  it('starts the study timer when Start Working is clicked', async () => {
    const { getByText } = renderApp();
    
    const startButton = getByText('START WORKING');
    startButton.click();

    // Check if mode changed
    expect(getByText('Focusing...')).toBeInTheDocument(); // Status Badge
    expect(getByText('25:00')).toBeInTheDocument(); // Timer Display

    // Advance timer by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(getByText('24:59')).toBeInTheDocument();
  });

  it('allows manual stop of the session', () => {
    const { getByText } = renderApp();
    
    // Start
    getByText('START WORKING').click();
    
    // Check buttons available in Study Mode
    const takeBreakBtn = getByText('Take Break');
    const endSessionBtn = getByText('End Session');
    
    expect(takeBreakBtn).toBeInTheDocument();
    expect(endSessionBtn).toBeInTheDocument();

    // End Session
    endSessionBtn.click();

    // Should return to IDLE
    expect(getByText('START WORKING')).toBeInTheDocument();
  });

  it('shows dual summary when stopping a session with work and breaks', async () => {
    const { getByText, queryByText } = renderApp();

    // 1. Start Work
    getByText('START WORKING').click();
    act(() => { vi.advanceTimersByTime(2000); }); // Work 2s

    // 2. Take Break
    getByText('Take Break').click();
    expect(getByText('Chilling Time')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2000); }); // Break 2s

    // 3. End Session during break
    getByText('End Session').click();

    // 4. Verify Modal Content
    // Should show "Session Complete" because work was done
    expect(getByText('Session Complete!')).toBeInTheDocument();
    
    // Should show dual stats
    expect(getByText('Time Worked')).toBeInTheDocument();
    expect(getByText('Break Duration')).toBeInTheDocument();

    // Verify values (Work ~2s, Break ~2s)
    // Note: formatDuration(2) is "2 s"
    const values = document.querySelectorAll('.font-display.text-4xl');
    // We expect 2 values in the modal
    expect(values.length).toBe(2); 
  });

  it('auto-completes a session and shows summary with auto-renew countdown', () => {
    const { getByText } = renderApp();
    
    // Start (25 min default = 1500 seconds)
    getByText('START WORKING').click();
    
    // Advance time to 0
    act(() => {
      vi.advanceTimersByTime(1500 * 1000 + 100); 
    });
    
    // Run any pending timeouts (the completeSession callback)
    act(() => {
      vi.runAllTimers();
    });

    // Expect Modal (Session Complete)
    expect(getByText('Session Complete!')).toBeInTheDocument();
    
    // Expect "Starting in" (auto-renew countdown)
    expect(getByText(/Starting in/)).toBeInTheDocument();
  });

  it('opens and closes the settings modal', () => {
    const { getByText, getByLabelText, queryByText } = renderApp();
    
    // Click on the duration display (which is a button in IDLE mode)
    const settingsTrigger = getByLabelText(/Current target duration is/i);
    settingsTrigger.click();

    expect(getByText('Settings')).toBeInTheDocument();
    expect(getByLabelText('Work Duration (min)')).toBeInTheDocument();

    const closeButton = getByText('Cancel');
    closeButton.click();

    expect(queryByText('Settings')).not.toBeInTheDocument();
  });

  it('renders the footer with correct link and version', () => {
    const { getByText, getByLabelText } = renderApp();
    expect(getByText('Made with ❤️ by Krishna')).toBeInTheDocument();
    const githubLink = getByLabelText('GitHub Profile');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/krishnaacc123');
    // Check version presence (v1.1.0)
    expect(getByText('v1.1.0')).toBeInTheDocument();
  });
});