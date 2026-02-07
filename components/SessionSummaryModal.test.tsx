import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import SessionSummaryModal from './SessionSummaryModal';
import { LanguageProvider } from '../contexts/LanguageContext';
import { SummaryData } from '../types';

describe('SessionSummaryModal', () => {
  const defaultData: SummaryData = {
    type: 'STUDY',
    duration: 120, // seconds
    finishedNaturally: true
  };

  const defaultProps = {
    data: defaultData,
    onNext: vi.fn(),
    onEndSession: vi.fn(),
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
    const data: SummaryData = { ...defaultData, type: 'BREAK', duration: 60 };
    const { getByText } = renderWithContext(
      <SessionSummaryModal {...defaultProps} data={data} />
    );
    expect(getByText('Break Time Over')).toBeInTheDocument();
    expect(getByText('Break Duration')).toBeInTheDocument();
    expect(getByText('1 m')).toBeInTheDocument();
  });

  it('renders dual summary (Work + Break) correctly', () => {
    const data: SummaryData = {
        type: 'STUDY', 
        studyDuration: 300, 
        duration: 60, 
        finishedNaturally: true
    };
    const { getByText } = renderWithContext(
      <SessionSummaryModal 
        {...defaultProps} 
        data={data}
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