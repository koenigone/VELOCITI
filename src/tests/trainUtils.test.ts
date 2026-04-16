import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { calculateDelay, formatScheduleTime, formatTime, getTrainStatus } from '../utils/trainUtils';
import { createTrain } from './factories';

describe('trainUtils', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('formatScheduleTime', () => {
    it('formats four digit railway times', () => {
      expect(formatScheduleTime('1433')).toBe('14:33');
    });

    it('pads short railway times before formatting', () => {
      expect(formatScheduleTime('933')).toBe('09:33');
    });

    it('formats already colon-separated times safely', () => {
      expect(formatScheduleTime('9:05')).toBe('09:05');
    });

    it('returns fallback text for missing or invalid short values', () => {
      expect(formatScheduleTime(null)).toBe('--:--');
      expect(formatScheduleTime('9')).toBe('--:--');
    });
  });

  describe('formatTime', () => {
    it('returns fallback text for invalid dates', () => {
      expect(formatTime(undefined)).toBe('--:--');
      expect(formatTime('not-a-date')).toBe('--:--');
    });
  });

  describe('calculateDelay', () => {
    it('calculates delay in minutes from scheduled and actual ISO times', () => {
      expect(calculateDelay('2026-04-16T10:00:00Z', '2026-04-16T10:07:30Z')).toBe(8);
    });

    it('returns null when either time is missing or invalid', () => {
      expect(calculateDelay(null, '2026-04-16T10:00:00Z')).toBeNull();
      expect(calculateDelay('bad-date', '2026-04-16T10:00:00Z')).toBeNull();
    });
  });

  describe('getTrainStatus', () => {
    it('marks cancelled trains before any other status', () => {
      const status = getTrainStatus(createTrain({ cancelled: true, lastReportedDelay: 20 }));

      expect(status.label).toBe('CANCELLED');
      expect(status.badgeScheme).toBe('red');
    });

    it('marks trains as late when delay is greater than four minutes', () => {
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-16T10:30:00Z').getTime());

      const status = getTrainStatus(createTrain({ lastReportedDelay: 9 }));

      expect(status.label).toBe('9 MINS LATE');
      expect(status.badgeScheme).toBe('red');
    });

    it('marks a train as terminated only after scheduled arrival plus the buffer has passed', () => {
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-16T14:00:00Z').getTime());

      const status = getTrainStatus(createTrain({
        scheduledArrival: '2026-04-16T12:00:00Z',
        lastReportedDelay: 0,
      }));

      expect(status.label).toBe('TERMINATED');
      expect(status.badgeScheme).toBe('gray');
    });

    it('defaults to on time when no stronger status applies', () => {
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-16T10:30:00Z').getTime());

      const status = getTrainStatus(createTrain({ lastReportedDelay: 0 }));

      expect(status.label).toBe('ON TIME');
      expect(status.badgeScheme).toBe('green');
    });
  });
});
