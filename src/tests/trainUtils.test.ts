import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { calculateDelay, formatScheduleTime, formatTime, getTrainStatus } from '../utils/trainUtils';
import { createTrain } from './factories';

// tests for utility functions related to train data processing and status calculation
describe('trainUtils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-16T10:30:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatScheduleTime', () => {
    it.each([
      ['1433', '14:33'],
      ['933', '09:33'],
      ['9:05', '09:05'],
      ['09:5', '09:05'],
    ])('formats timetable value %s as %s', (raw, formatted) => {
      expect(formatScheduleTime(raw)).toBe(formatted);
    });

    it.each([null, undefined, '', '9'])('returns fallback text for unusable timetable value %s', (raw) => {
      expect(formatScheduleTime(raw)).toBe('--:--');
    });
  });

  describe('formatTime', () => {
    it('formats local ISO datetimes without leaking seconds', () => {
      expect(formatTime('2026-04-16T10:05:45')).toContain('10:05');
    });

    it.each([undefined, null, '', 'not-a-date'])('returns fallback text for invalid date value %s', (raw) => {
      expect(formatTime(raw)).toBe('--:--');
    });
  });

  describe('calculateDelay', () => {
    it('rounds delay to the nearest minute from scheduled and actual ISO times', () => {
      expect(calculateDelay('2026-04-16T10:00:00Z', '2026-04-16T10:07:30Z')).toBe(8);
    });

    it('keeps early running visible as a negative variation', () => {
      expect(calculateDelay('2026-04-16T10:00:00Z', '2026-04-16T09:57:00Z')).toBe(-3);
    });

    it.each([
      [null, '2026-04-16T10:00:00Z'],
      ['2026-04-16T10:00:00Z', undefined],
      ['bad-date', '2026-04-16T10:00:00Z'],
    ])('returns null for incomplete or invalid delay inputs', (scheduled, actual) => {
      expect(calculateDelay(scheduled, actual)).toBeNull();
    });
  });

  describe('getTrainStatus', () => {
    it('marks cancelled trains before delay or completed-journey status', () => {
      jest.setSystemTime(new Date('2026-04-16T14:00:00Z'));

      const status = getTrainStatus(createTrain({
        cancelled: true,
        lastReportedDelay: 20,
        scheduledArrival: '2026-04-16T12:00:00Z',
      }));

      expect(status.label).toBe('CANCELLED');
      expect(status.badgeScheme).toBe('red');
    });

    it('marks trains as late when delay is greater than four minutes', () => {
      const status = getTrainStatus(createTrain({ lastReportedDelay: 9 }));

      expect(status.label).toBe('9 MINS LATE');
      expect(status.badgeScheme).toBe('red');
    });

    it('does not trust premature TERMINATED reports before the arrival buffer has elapsed', () => {
      jest.setSystemTime(new Date('2026-04-16T12:30:00Z'));

      const status = getTrainStatus(createTrain({
        scheduledArrival: '2026-04-16T12:00:00Z',
        lastReportedType: 'TERMINATED',
        lastReportedDelay: 0,
      }));

      expect(status.label).toBe('ON TIME');
    });

    it('marks a train as terminated after scheduled arrival plus the buffer has elapsed', () => {
      jest.setSystemTime(new Date('2026-04-16T13:01:00Z'));

      const status = getTrainStatus(createTrain({
        scheduledArrival: '2026-04-16T12:00:00Z',
        lastReportedDelay: 0,
      }));

      expect(status.label).toBe('TERMINATED');
      expect(status.badgeScheme).toBe('gray');
    });

    it('treats delays of four minutes or less as on time', () => {
      const status = getTrainStatus(createTrain({ lastReportedDelay: 4 }));

      expect(status.label).toBe('ON TIME');
      expect(status.badgeScheme).toBe('green');
    });
  });
});