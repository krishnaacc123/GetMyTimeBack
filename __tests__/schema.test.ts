import { describe, it, expect } from 'vitest';
import { StudyLog, AppSettings } from '../types';

/**
 * Data Structure Stability Tests
 * 
 * Ensures that the core data shapes (logs and settings) used for persistence 
 * and export/import do not unintentionally drift or break backward compatibility.
 */

describe('Data Structure Schema', () => {
    it('StudyLog matches expected v1 schema', () => {
        // Define a "frozen" example of what a log should look like
        const expectedKeys = ['id', 'startTime', 'durationSeconds', 'type', 'timestamp', 'isManual', 'sessionId'];
        
        // Mock object based on current type definition
        const log: StudyLog = {
            id: 'test-id',
            sessionId: 'session-123',
            startTime: 1600000000000,
            durationSeconds: 1500,
            type: 'STUDY',
            timestamp: 1600000000000,
            isManual: false
        };

        // Ensure keys exist
        expectedKeys.forEach(key => {
            expect(log).toHaveProperty(key);
        });

        // Ensure no "note" field exists (regression test for removed feature)
        expect((log as any).note).toBeUndefined();
    });

    it('AppSettings matches expected v1 schema', () => {
        const expectedKeys = ['studyDuration', 'breakDuration', 'isDarkMode', 'soundEnabled'];
        
        const settings: AppSettings = {
            studyDuration: 25,
            breakDuration: 5,
            isDarkMode: false,
            soundEnabled: true
        };

        expectedKeys.forEach(key => {
            expect(settings).toHaveProperty(key);
        });
    });

    it('Simulates Import Validation', () => {
        // Mock import payload
        const importData = {
            logs: [
                {
                    id: '1',
                    startTime: 12345,
                    durationSeconds: 60,
                    type: 'STUDY',
                    timestamp: 12345
                }
            ],
            settings: {
                studyDuration: 25,
                breakDuration: 5,
                soundEnabled: false,
                isDarkMode: false
            }
        };

        // Basic validation logic used in SettingsModal
        expect(Array.isArray(importData.logs)).toBe(true);
        expect(typeof importData.settings).toBe('object');
        
        const log = importData.logs[0];
        expect(log.type).toBe('STUDY');
        expect(typeof log.durationSeconds).toBe('number');
    });
});
