import { describe, expect, it } from '@jest/globals';
import { mergeLiveTrain } from '../hooks/useLiveSelectedTrain';
import { createTrain } from './factories';

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
});