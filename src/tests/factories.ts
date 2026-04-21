import type { Train } from '../types';

// dummy train factory for test data generation
export const createTrain = (overrides: Partial<Train> = {}): Train => ({
  trainId: 'train-1',
  headCode: '1A23',
  toc_Name: 'Test Operator',
  originTiploc: 'SHEFFLD',
  originLocation: 'Sheffield',
  scheduledDeparture: '2026-04-16T10:00:00.000Z',
  actualDeparture: undefined,
  destinationTiploc: 'EUSTON',
  destinationLocation: 'London Euston',
  scheduledArrival: '2026-04-16T12:00:00.000Z',
  actualArrival: undefined,
  lastReportedLocation: 'Sheffield',
  lastReportedDelay: 0,
  lastReportedType: 'DEPARTURE',
  cancelled: false,
  activationId: 123,
  scheduleId: 456,
  ...overrides,
});