import { describe, expect, it } from '@jest/globals';
import { buildTimeline } from '../components/panel/trainDetailPanel';
import { createMovementEvent, createScheduleStop, createTrain } from './factories';
import type { ScheduleStop } from '../types';

// tests for the buildTimeline function that constructs the train's timeline of stops and events
describe('buildTimeline', () => {
  it('merges the ordered schedule with matching movement events', () => {
    const schedule: ScheduleStop[] = [
      createScheduleStop({
        tiploc: 'SHEFFLD',
        location: 'Sheffield',
        latLong: { latitude: 53.38, longitude: -1.46 },
        departure: '1010',
      }),
      createScheduleStop({
        tiploc: 'DERBY',
        location: 'Derby',
        latLong: { latitude: 52.91, longitude: -1.46 },
        departure: undefined,
        pass: '1040',
      }),
      createScheduleStop({
        tiploc: 'EUSTON',
        location: 'London Euston',
        latLong: { latitude: 51.53, longitude: -0.13 },
        departure: undefined,
        arrival: '1200',
      }),
    ];

    const movements = [
      createMovementEvent({
        location: 'Sheffield',
        eventType: 'DEPARTURE',
        planned: '2026-04-16T10:10:00Z',
        actual: '2026-04-16T10:13:00Z',
        variation: 3,
      }),
      createMovementEvent({
        location: 'london euston',
        eventType: 'DESTINATION',
        planned: '2026-04-16T12:00:00Z',
        actual: '2026-04-16T12:08:00Z',
        variation: 8,
      }),
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
      latitude: 53.38,
      longitude: -1.46,
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

  it('keeps stops without movement data in the timeline with null actuals', () => {
    const timeline = buildTimeline(
      [createScheduleStop({ tiploc: 'CHESTER', location: 'Chesterfield', departure: '1021' })],
      [],
      createTrain()
    );

    expect(timeline).toEqual([
      expect.objectContaining({
        tiploc: 'CHESTER',
        scheduledTime: '1021',
        actualTime: null,
        variation: null,
      }),
    ]);
  });

  it('falls back to zero coordinates when a schedule stop has no latLong object', () => {
    const stopWithoutCoordinates = {
      tiploc: 'NOCOORD',
      location: 'No Coordinates',
      departure: '0900',
    } as ScheduleStop;

    const [timelineStop] = buildTimeline([stopWithoutCoordinates], [], createTrain());

    expect(timelineStop.latitude).toBe(0);
    expect(timelineStop.longitude).toBe(0);
  });

  it('builds an origin-to-destination fallback when the schedule endpoint returns nothing', () => {
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
        latitude: 0,
        longitude: 0,
        scheduledTime: '2026-04-16T10:00:00Z',
        actualTime: '2026-04-16T10:02:00Z',
        eventType: 'departure',
        isPass: false,
      }),
      expect.objectContaining({
        tiploc: 'EUSTON',
        name: 'London Euston',
        latitude: 0,
        longitude: 0,
        scheduledTime: '2026-04-16T12:00:00Z',
        actualTime: '2026-04-16T12:05:00Z',
        eventType: 'arrival',
        isPass: false,
      }),
    ]);
  });
});