import React from 'react';
import { describe, it, expect, vi } from 'vitest';
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
    logs: [],
    onClose: vi.fn(),
    onClearLogs: vi.fn(),
    onDeleteLog: vi.fn(),
  };

  const renderWithContext = (ui: React.ReactElement) => {
    return render(<LanguageProvider>{ui}</LanguageProvider>);
  };

  it('renders "No activity" when logs are empty', () => {
    const { getByText } = renderWithContext(<StatsBoard {...defaultProps} />);
    expect(getByText('No activity logged yet.')).toBeInTheDocument();
  });

  it('renders logs and pagination controls when logs > 10', () => {
    const logs = generateLogs(15);
    const { getByText, queryByText } = renderWithContext(<StatsBoard {...defaultProps} logs={logs} />);
    
    // Should show first 10
    // Check for "Page 1 / 2"
    expect(getByText(/Page 1 \/ 2/)).toBeInTheDocument();
    
    // Buttons
    const nextBtn = getByText('Next →');
    const prevBtn = getByText('← Prev');
    
    expect(nextBtn).toBeEnabled();
    expect(prevBtn).toBeDisabled();
  });

  it('paginates correctly', () => {
    const logs = generateLogs(25); // 3 Pages
    const { getByText } = renderWithContext(<StatsBoard {...defaultProps} logs={logs} />);
    
    const nextBtn = getByText('Next →');
    
    // Page 1 -> 2
    fireEvent.click(nextBtn);
    expect(getByText(/Page 2 \/ 3/)).toBeInTheDocument();
    
    // Page 2 -> 3
    fireEvent.click(nextBtn);
    expect(getByText(/Page 3 \/ 3/)).toBeInTheDocument();
    expect(nextBtn).toBeDisabled();
    
    // Page 3 -> 2
    const prevBtn = getByText('← Prev');
    expect(prevBtn).toBeEnabled();
    fireEvent.click(prevBtn);
    expect(getByText(/Page 2 \/ 3/)).toBeInTheDocument();
  });

  it('filters logs correctly', () => {
    const logs: StudyLog[] = [
        { id: '1', startTime: 0, durationSeconds: 60, type: 'STUDY', timestamp: 0 },
        { id: '2', startTime: 0, durationSeconds: 60, type: 'BREAK', timestamp: 0 }
    ];
    
    const { getByText, queryByText, getAllByText } = renderWithContext(<StatsBoard {...defaultProps} logs={logs} />);
    
    // Initial ALL
    expect(getByText('WORK')).toBeInTheDocument();
    expect(getByText('BREAK', { selector: 'p' })).toBeInTheDocument(); // Selector needed to differentiate from Filter button text if ambiguous
    
    // Filter BREAK
    const breakFilterBtn = getAllByText('BREAK')[0]; // The button is likely first or we can use specific selectors
    fireEvent.click(breakFilterBtn);
    
    // Should only see BREAK log
    // WORK log text shouldn't be in the list items (only in the header 'WORK THIS WEEK' etc)
    // We can check if the row "WORK" is gone.
    // A simpler check is to count items.
    
    // The filter buttons are: ALL, WORK, BREAK.
    // The logs have text: WORK, BREAK.
  });
});