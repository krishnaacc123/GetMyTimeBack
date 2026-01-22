import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import SessionSummaryModal from './SessionSummaryModal';
import { LanguageProvider } from '../contexts/LanguageContext';

describe('SessionSummaryModal', () => {
  const defaultProps = {
    type: 'STUDY' as const,
    durationSeconds: 120,
    onNext: vi.fn(),
    onEndSession: vi.fn(),
    finishedNaturally: true
  };

  const renderWithContext = (ui: React.ReactElement) => {
    return render(<LanguageProvider>{ui}</LanguageProvider>);
  };

  it('renders single study summary correctly', () => {
    const { getByText } = renderWithContext(<SessionSummaryModal {...defaultProps} />);
    expect(getByText('Session Complete!')).toBeInTheDocument();
    expect(getByText('Time Worked')).toBeInTheDocument();
    expect(getByText('2 m')).toBeInTheDocument();
  });

  it('renders single break summary correctly', () => {
    const { getByText } = renderWithContext(
      <SessionSummaryModal {...defaultProps} type="BREAK" durationSeconds={60} />
    );
    expect(getByText('Break Time Over')).toBeInTheDocument();
    expect(getByText('Break Duration')).toBeInTheDocument();
    expect(getByText('1 m')).toBeInTheDocument();
  });

  it('renders dual summary (Work + Break) correctly', () => {
    const { getByText, getAllByText } = renderWithContext(
      <SessionSummaryModal 
        {...defaultProps} 
        type="STUDY" // Main type context
        studyDuration={300} // 5m work
        durationSeconds={60} // 1m break
      />
    );

    // Title should be Session Complete
    expect(getByText('Session Complete!')).toBeInTheDocument();

    // Should see both labels
    expect(getByText('Time Worked')).toBeInTheDocument();
    expect(getByText('Break Duration')).toBeInTheDocument();

    // Should see values
    expect(getByText('5 m')).toBeInTheDocument();
    expect(getByText('1 m')).toBeInTheDocument();
  });
});