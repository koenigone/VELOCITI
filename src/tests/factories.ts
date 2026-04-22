import type { MovementEvent, ScheduleStop, TiplocData, Train } from '../types';

// create test train data (mock data for Jest tests)
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

// create test TIPLOC data
export const createTiploc = (overrides: Partial<TiplocData> = {}): TiplocData => ({
  Name: 'Sheffield',
  Tiploc: 'SHEFFLD',
  Stanox: 12345,
  InBPlan: true,
  InTPS: true,
  IsTiploc: true,
  Codes: ['SHF'],
  Latitude: 53.38,
  Longitude: -1.46,
  ...overrides,
  Details: {
    BPlan_TimingPoint: null,
    TPS_StationType: null,
    TPS_StationCategory: 'Interchange',
    CRS: 'SHF',
    Nalco: null,
    OffNetwork: false,
    ForceLPB: null,
    CompulsoryStop: false,
    UIC: null,
    Zone: null,
    ...(overrides.Details ?? {}),
  },
});

// create test schedule stop data
export const createScheduleStop = (overrides: Partial<ScheduleStop> = {}): ScheduleStop => ({
  tiploc: 'SHEFFLD',
  location: 'Sheffield',
  departure: '1010',
  ...overrides,
  latLong: {
    latitude: 53.38,
    longitude: -1.46,
    ...(overrides.latLong ?? {}),
  },
});

// create test movement event data
export const createMovementEvent = (overrides: Partial<MovementEvent> = {}): MovementEvent => ({
  location: 'Sheffield',
  eventType: 'DEPARTURE',
  planned: '2026-04-16T10:10:00Z',
  actual: '2026-04-16T10:13:00Z',
  variation: 3,
  ...overrides,
});