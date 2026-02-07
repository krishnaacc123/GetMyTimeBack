import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import StatsBoard from './StatsBoard';
import { LanguageProvider } from '../contexts/LanguageContext';
import { StudyLog } from '../types';

// Mock Recharts
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div className="recharts-responsive-container">{children}</div>,
    BarChart: () => <div className="recharts-bar-chart"></div>,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

// Mock useLogs
const mockUseLogs = vi.fn();
vi.mock('../contexts/LogsContext', async () => {
  const actual = await vi.importActual('../contexts/LogsContext');
  return {
    ...actual,
    useLogs: () => mockUseLogs(),
  };
});

// Helper to generate mock logs
const generateLogs = (count: number): StudyLog[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `log-${i}`,
    startTime: Date.now() - i * 100000,
    durationSeconds: 1800, // 30 min
    type: 'STUDY',
    timestamp: Date.now() - i * 100000,
  }));
};

describe('StatsBoard', () => {
  const defaultProps = {
    onClose: vi.fn(),
  };

  const defaultContext = {
    logs: [] as StudyLog[],
    todayStats: { totalSeconds: 0, sessions: 0 },
    addLog: vi.fn(),
    deleteLog: vi.fn(),
    clearLogs: vi.fn(),
  };

  beforeEach(() => {
    mockUseLogs.mockReturnValue(defaultContext);
  });

  const renderWithContext = (ui: React.ReactElement) => {
    return render(<LanguageProvider>{ui}</LanguageProvider>);
  };

  it('renders "No activity" when logs are empty', () => {
    const { getByText } = renderWithContext(<StatsBoard {...defaultProps} />);
    expect(getByText('No activity logged yet.')).toBeInTheDocument();
  });

  it('renders "Session Activity" header', () => {
    const { getByText } = renderWithContext(<StatsBoard {...defaultProps} />);
    expect(getByText('Session Activity')).toBeInTheDocument();
  });

  it('prioritizes Work Today stats', () => {
    const logs = generateLogs(1);
    const contextWithStats = {
      ...defaultContext,
      logs,
      todayStats: { totalSeconds: 1800, sessions: 1 }
    };
    mockUseLogs.mockReturnValue(contextWithStats);

    const { getByText } = renderWithContext(<StatsBoard {...defaultProps} />);
    // "Work Today" should be present
    expect(getByText('Work Today')).toBeInTheDocument();
  });

  it('renders logs and pagination controls when logs > 10', () => {
    const logs = generateLogs(15);
    mockUseLogs.mockReturnValue({ ...defaultContext, logs });

    const { getByText } = renderWithContext(<StatsBoard {...defaultProps} />);
    
    // Should show first 10
    // Check for "Page 1 / 2"
    expect(getByText(/Page 1 \/ 2/)).toBeInTheDocument();
    
    // Buttons (Next is Right Arrow)
    const nextBtn = getByText('→');
    expect(nextBtn).toBeEnabled();
  });

  it('paginates correctly', () => {
    const logs = generateLogs(25); // 3 Pages
    mockUseLogs.mockReturnValue({ ...defaultContext, logs });

    const { getByText } = renderWithContext(<StatsBoard {...defaultProps} />);
    
    const nextBtn = getByText('→');
    
    // Page 1 -> 2
    fireEvent.click(nextBtn);
    expect(getByText(/Page 2 \/ 3/)).toBeInTheDocument();
    
    // Page 2 -> 3
    fireEvent.click(nextBtn);
    expect(getByText(/Page 3 \/ 3/)).toBeInTheDocument();
    expect(nextBtn).toBeDisabled();
    
    // Page 3 -> 2
    const prevBtn = getByText('←');
    expect(prevBtn).toBeEnabled();
    fireEvent.click(prevBtn);
    expect(getByText(/Page 2 \/ 3/)).toBeInTheDocument();
  });

  it('groups logs with the same sessionId', () => {
     const logs: StudyLog[] = [
        { id: '1', sessionId: 'sess-abc', startTime: Date.now(), durationSeconds: 60, type: 'STUDY', timestamp: Date.now() },
        { id: '2', sessionId: 'sess-abc', startTime: Date.now() + 60000, durationSeconds: 60, type: 'BREAK', timestamp: Date.now() + 60000 }
     ];
     mockUseLogs.mockReturnValue({ ...defaultContext, logs });
     
     const { container } = renderWithContext(<StatsBoard {...defaultProps} />);
     
     // Look for the expandable group button
     const groupBtn = container.querySelector('button.w-full.text-left');
     expect(groupBtn).toBeInTheDocument();
     
     // The individual log cards shouldn't be visible yet
     const logCards = container.querySelectorAll('.p-4.bg-retro-paper .relative.group');
     expect(logCards.length).toBe(0);
     
     // Expand
     fireEvent.click(groupBtn!);
     
     // Now 2 logs should be visible
     const visibleCards = container.querySelectorAll('.p-4.bg-retro-paper .relative.group');
     expect(visibleCards.length).toBe(2);
  });
});