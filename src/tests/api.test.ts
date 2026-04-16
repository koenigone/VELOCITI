import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { trainApi } from '../api/api';
import { createTrain } from './factories';

const jsonResponse = (body: unknown, ok = true, status = 200): Response => ({
  ok,
  status,
  json: jest.fn(async () => body),
} as unknown as Response);

describe('trainApi', () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-16T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    fetchMock.mockReset();
  });

  it('does not call the TIPLOC location endpoint when the input list is empty', async () => {
    const result = await trainApi.getTiplocLocations([]);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalises and de-duplicates TIPLOC location requests', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      tiplocsLocations: [{ id: 1, tiploc: 'SHEFFLD', latitude: 53.38, longitude: -1.46, stanox: '123' }],
    }));

    const result = await trainApi.getTiplocLocations(['sheffld', 'SHEFFLD', 'euston']);

    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/Tiploc/TiplocLocations'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ Tiplocs: ['SHEFFLD', 'EUSTON'] }),
      })
    );
  });

  it('throws a useful error when a location lookup returns no matches', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ tiplocsLocations: [] }));

    await expect(trainApi.getLocation('BADCODE')).rejects.toThrow('Location not found for TIPLOC: BADCODE');
  });

  it('builds the station trains URL using unique uppercase TIPLOCs and today\'s date range', async () => {
    const train = createTrain();
    fetchMock.mockResolvedValue(jsonResponse([train]));

    const result = await trainApi.getTrainsAtTiplocs([' sheffld ', '', 'euston', 'SHEFFLD']);
    const calledUrl = fetchMock.mock.calls[0][0] as string;

    expect(result).toEqual([train]);
    expect(calledUrl).toContain('/trains/tiploc/SHEFFLD,EUSTON/');
    expect(calledUrl).toContain('2026-04-16%2000%3A00%3A00');
    expect(calledUrl).toContain('2026-04-16%2023%3A59%3A59');
  });

  it('returns an empty list when the train endpoint response is not an array', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'No data' }));

    await expect(trainApi.getTrainsAtStation('SHEFFLD')).resolves.toEqual([]);
  });

  it('throws the endpoint context when the API returns an HTTP error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Server error' }, false, 500));

    await expect(trainApi.getTrainSchedule(1, 2)).rejects.toThrow('Train schedule fetch failed (Status: 500)');
  });
});
