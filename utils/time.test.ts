
import { describe, it, expect } from 'vitest';
import { formatTime, formatDuration, getDayKey } from './time';

describe('Time Utils', () => {
  describe('formatTime', () => {
    it('formats seconds into MM:SS', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(5)).toBe('00:05');
      expect(formatTime(59)).toBe('00:59');
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(3599)).toBe('59:59');
    });
  });

  describe('formatDuration', () => {
    it('formats duration into readable string', () => {
      expect(formatDuration(30)).toBe('30 s');
      expect(formatDuration(60)).toBe('1 m');
      expect(formatDuration(90)).toBe('1 m 30 s');
      expect(formatDuration(3600)).toBe('1 h');
      expect(formatDuration(3665)).toBe('1 h 1 m 5 s');
    });
  });

  describe('getDayKey', () => {
    it('returns a localized date string', () => {
      const timestamp = new Date('2023-10-15T10:00:00').getTime();
      // Note: This output depends on the test runner's locale, usually en-US in CI
      const key = getDayKey(timestamp);
      expect(key).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });
});
