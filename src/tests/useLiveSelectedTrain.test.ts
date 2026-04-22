import { describe, expect, it } from '@jest/globals';
import { isLiveUpdateForTrain, mergeLiveTrain } from '../hooks/useLiveSelectedTrain';
import { createTrain } from './factories';

// tests for the logic that merges live socket updates into the selected train's data
describe('mergeLiveTrain', () => {
  it('applies live fields from a socket update onto the selected train', () => {
    const train = createTrain({
      lastReportedLocation: 'Sheffield',
      lastReportedDelay: 0,
      lastReportedLatitude: undefined,
      lastReportedLongitude: undefined,
    });

    const merged = mergeLiveTrain(train, {
      lastReportedLocation: 'Derby',
      lastReportedDelay: 6,
      lastReportedType: 'ARRIVAL',
      actualArrival: '2026-04-16T10:45:00Z',
      lastReportedLatitude: 52.91,
      lastReportedLongitude: -1.46,
    });

    expect(merged).toEqual(expect.objectContaining({
      trainId: train.trainId,
      headCode: train.headCode,
      lastReportedLocation: 'Derby',
      lastReportedDelay: 6,
      lastReportedType: 'ARRIVAL',
      actualArrival: '2026-04-16T10:45:00Z',
      lastReportedLatitude: 52.91,
      lastReportedLongitude: -1.46,
    }));
  });

  it('accepts explicit zero and false values from live updates', () => {
    const train = createTrain({
      lastReportedDelay: 12,
      cancelled: true,
      lastReportedLatitude: 53.38,
      lastReportedLongitude: -1.46,
    });

    const merged = mergeLiveTrain(train, {
      lastReportedDelay: 0,
      cancelled: false,
      lastReportedLatitude: 0,
      lastReportedLongitude: 0,
    });

    expect(merged.lastReportedDelay).toBe(0);
    expect(merged.cancelled).toBe(false);
    expect(merged.lastReportedLatitude).toBe(0);
    expect(merged.lastReportedLongitude).toBe(0);
  });

  it('preserves existing values when the socket update omits them', () => {
    const train = createTrain({
      headCode: '1A23',
      lastReportedDelay: 4,
      cancelled: false,
    });

    const merged = mergeLiveTrain(train, {
      trainId: train.trainId,
      headCode: undefined,
      lastReportedDelay: undefined,
      cancelled: undefined,
    });

    expect(merged.headCode).toBe('1A23');
    expect(merged.lastReportedDelay).toBe(4);
    expect(merged.cancelled).toBe(false);
  });

  it('returns a new train object without mutating the previous selection', () => {
    const train = createTrain({ lastReportedLocation: 'Sheffield' });

    const merged = mergeLiveTrain(train, { lastReportedLocation: 'Derby' });

    expect(merged).not.toBe(train);
    expect(train.lastReportedLocation).toBe('Sheffield');
    expect(merged.lastReportedLocation).toBe('Derby');
  });
});

describe('isLiveUpdateForTrain', () => {
  it('matches payloads by trainId when the backend provides one', () => {
    const train = createTrain({ trainId: 'train-1', activationId: 123, scheduleId: 456 });

    expect(isLiveUpdateForTrain(train, {
      trainId: 'train-1',
      activationId: 999,
      scheduleId: 999,
    })).toBe(true);
  });

  it('does not accept a different trainId even when activation IDs happen to match', () => {
    const train = createTrain({ trainId: 'train-1', activationId: 123, scheduleId: 456 });

    expect(isLiveUpdateForTrain(train, {
      trainId: 'other-train',
      activationId: 123,
      scheduleId: 456,
    })).toBe(false);
  });

  it('falls back to activation and schedule IDs when trainId is absent', () => {
    const train = createTrain({ activationId: 123, scheduleId: 456 });

    expect(isLiveUpdateForTrain(train, { activationId: 123, scheduleId: 456 })).toBe(true);
    expect(isLiveUpdateForTrain(train, { activationId: 123, scheduleId: 999 })).toBe(false);
    expect(isLiveUpdateForTrain(train, { activationId: 123 })).toBe(false);
  });
});