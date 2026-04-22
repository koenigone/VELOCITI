import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { trainApi } from '../api/api';
import { createTrain } from './factories';

// mocking fetch globally for all tests
const API_BASE = 'https://traindata-stag-api.railsmart.io/api';

// create a mock Response object with a JSON body
const jsonResponse = (body: unknown, ok = true, status = 200): Response => ({
  ok,
  status,
  json: jest.fn(async () => body),
} as unknown as Response);


describe('trainApi', () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => { // ovverride global fetch with our mock before each test
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-16T12:00:00Z'));
  });

  afterEach(() => { // reset fetch mock and timers after each test
    jest.useRealTimers();
    fetchMock.mockReset();
  });

  // API endpoints tests
  it('short-circuits location lookups when there is nothing to request', async () => {
    const result = await trainApi.getTiplocLocations([]);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs one uppercase TIPLOC payload for duplicate location requests', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      tiplocsLocations: [{ id: 1, tiploc: 'SHEFFLD', latitude: 53.38, longitude: -1.46, stanox: '123' }],
    }));

    const result = await trainApi.getTiplocLocations(['sheffld', 'SHEFFLD', 'euston']);
    const [url, options] = fetchMock.mock.calls[0];

    expect(result).toHaveLength(1);
    expect(url).toBe(`${API_BASE}/Tiploc/TiplocLocations`);
    expect(options).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ Tiplocs: ['SHEFFLD', 'EUSTON'] }),
    });
  });

  // defensive handling of unexpected response shapes
  it('returns an empty location list when the response body is missing the expected array', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'No TIPLOCs found' }));

    await expect(trainApi.getTiplocLocations(['UNKNOWN'])).resolves.toEqual([]);
  });

  it('throws a useful error when a location lookup returns no matches', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ tiplocsLocations: [] }));

    await expect(trainApi.getLocation('BADCODE')).rejects.toThrow('Location not found for TIPLOC: BADCODE');
  });

  it('does not fetch station trains for blank TIPLOC input', async () => {
    const result = await trainApi.getTrainsAtTiplocs([' ', '', '   ']);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('builds station train URLs with unique TIPLOCs and the current service day', async () => {
    const train = createTrain();
    fetchMock.mockResolvedValue(jsonResponse([train]));

    const result = await trainApi.getTrainsAtTiplocs([' sheffld ', '', 'euston', 'SHEFFLD']);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const options = fetchMock.mock.calls[0][1];

    expect(result).toEqual([train]);
    expect(decodeURIComponent(calledUrl)).toBe(
      `${API_BASE}/trains/tiploc/SHEFFLD,EUSTON/2026-04-16 00:00:00/2026-04-16 23:59:59`
    );
    expect(options).toMatchObject({ method: 'GET' });
  });

  it('returns an empty list when the train endpoint response is not an array', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'No data' }));

    await expect(trainApi.getTrainsAtStation('SHEFFLD')).resolves.toEqual([]);
  });

  it('keeps schedule and movement endpoints defensive against malformed success bodies', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ schedule: [] }))
      .mockResolvedValueOnce(jsonResponse({ movements: [] }));

    await expect(trainApi.getTrainSchedule(123, 456)).resolves.toEqual([]);
    await expect(trainApi.getTrainMovement(123, 456)).resolves.toEqual([]);
  });

  it('throws the endpoint context and HTTP status when the API returns an error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Server error' }, false, 500));

    await expect(trainApi.getTrainSchedule(1, 2)).rejects.toThrow('Train schedule fetch failed (Status: 500)');
  });
});