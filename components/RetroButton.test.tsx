import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import RetroButton from './RetroButton';

describe('RetroButton', () => {
  it('renders children correctly', () => {
    const { getByText } = render(<RetroButton>Click Me</RetroButton>);
    expect(getByText('Click Me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    const { getByText } = render(<RetroButton onClick={handleClick}>Action</RetroButton>);
    
    // Use native click since fireEvent import is failing in this environment
    getByText('Action').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes correctly', () => {
    const { getByText, rerender } = render(<RetroButton variant="danger">Danger</RetroButton>);
    const button = getByText('Danger');
    expect(button.className).toContain('bg-retro-pink');

    rerender(<RetroButton variant="success">Success</RetroButton>);
    expect(button.className).toContain('bg-retro-green');
  });
});