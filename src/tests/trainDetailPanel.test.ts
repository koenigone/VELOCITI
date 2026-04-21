import { describe, expect, it } from '@jest/globals';
import { buildTimeline } from '../components/panel/trainDetailPanel';
import { createTrain } from './factories';
import type { MovementEvent, ScheduleStop } from '../types';

describe('buildTimeline', () => {
  it('merges schedule stops with matching movement data', () => {
    const schedule: ScheduleStop[] = [
      {
        tiploc: 'SHEFFLD',
        location: 'Sheffield',
        latLong: { latitude: 53.38, longitude: -1.46 },
        departure: '1010',
      },
      {
        tiploc: 'DERBY',
        location: 'Derby',
        latLong: { latitude: 52.91, longitude: -1.46 },
        pass: '1040',
      },
      {
        tiploc: 'EUSTON',
        location: 'London Euston',
        latLong: { latitude: 51.53, longitude: -0.13 },
        arrival: '1200',
      },
    ];

    const movements: MovementEvent[] = [
      {
        location: 'Sheffield',
        eventType: 'DEPARTURE',
        planned: '2026-04-16T10:10:00Z',
        actual: '2026-04-16T10:13:00Z',
        variation: 3,
      },
      {
        location: 'London Euston',
        eventType: 'DESTINATION',
        planned: '2026-04-16T12:00:00Z',
        actual: '2026-04-16T12:08:00Z',
        variation: 8,
      },
    ];

    const timeline = buildTimeline(schedule, movements, createTrain());

    expect(timeline).toHaveLength(3);
    expect(timeline[0]).toMatchObject({
      tiploc: 'SHEFFLD',
      name: 'Sheffield',
      scheduledTime: '1010',
      actualTime: '2026-04-16T10:13:00Z',
      variation: 3,
      eventType: 'departure',
      isPass: false,
    });
    expect(timeline[1]).toMatchObject({
      tiploc: 'DERBY',
      scheduledTime: '1040',
      actualTime: null,
      variation: null,
      eventType: 'pass',
      isPass: true,
    });
    expect(timeline[2]).toMatchObject({
      tiploc: 'EUSTON',
      scheduledTime: '1200',
      actualTime: '2026-04-16T12:08:00Z',
      variation: 8,
      eventType: 'arrival',
    });
  });

  it('builds an origin to destination fallback when the schedule endpoint returns nothing', () => {
    const train = createTrain({
      originTiploc: 'SHEFFLD',
      originLocation: 'Sheffield',
      scheduledDeparture: '2026-04-16T10:00:00Z',
      actualDeparture: '2026-04-16T10:02:00Z',
      destinationTiploc: 'EUSTON',
      destinationLocation: 'London Euston',
      scheduledArrival: '2026-04-16T12:00:00Z',
      actualArrival: '2026-04-16T12:05:00Z',
    });

    const timeline = buildTimeline([], [], train);

    expect(timeline).toEqual([
      expect.objectContaining({
        tiploc: 'SHEFFLD',
        name: 'Sheffield',
        scheduledTime: '2026-04-16T10:00:00Z',
        actualTime: '2026-04-16T10:02:00Z',
        eventType: 'departure',
      }),
      expect.objectContaining({
        tiploc: 'EUSTON',
        name: 'London Euston',
        scheduledTime: '2026-04-16T12:00:00Z',
        actualTime: '2026-04-16T12:05:00Z',
        eventType: 'arrival',
      }),
    ]);
  });
});