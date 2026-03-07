import type { Train, TiplocLocation, ScheduleStop, MovementEvent } from '../types';

// api config
const API_BASE = "https://traindata-stag-api.railsmart.io/api";
const API_KEY = import.meta.env.VITE_VELOCITI_API_KEY;


// shared headers for all API requests
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-ApiKey': API_KEY
});


// shared response handler — throws on HTTP errors, returns parsed JSON
const handleResponse = async (response: Response, context: string) => {
  if (!response.ok) {
    throw new Error(`${context} (Status: ${response.status})`);
  }
  return response.json();
};


// main API object with methods for all endpoints
export const trainApi = {

  // ---- POST /api/Tiploc/TiplocLocations ----
  // fetches lat/lng coordinates for an array of TIPLOC codes
  getTiplocLocations: async (tiplocs: string[]): Promise<TiplocLocation[]> => {
    if (!tiplocs.length) return [];

    const response = await fetch(`${API_BASE}/Tiploc/TiplocLocations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ Tiplocs: [...new Set(tiplocs.map(t => t.toUpperCase()))] })
    });

    const data = await handleResponse(response, "TIPLOC location fetch failed");
    return data.tiplocsLocations || [];
  },


  // convenience wrapper: fetch a single TIPLOC's location
  getLocation: async (tiploc: string): Promise<TiplocLocation> => {
    const locations = await trainApi.getTiplocLocations([tiploc]);

    if (locations.length === 0) {
      throw new Error(`Location not found for TIPLOC: ${tiploc}`);
    }

    return locations[0];
  },


  // ---- GET /api/trains/tiploc/{tiplocs}/{startDateTime}/{endDateTime} ----
  // fetches train data for given TIPLOCs within today's date range
  getTrainsAtStation: async (tiploc: string): Promise<Train[]> => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const startStr = `${dateStr} 00:00:00`;
    const endStr = `${dateStr} 23:59:59`;

    const url = `${API_BASE}/trains/tiploc/${tiploc.toUpperCase()}/${encodeURIComponent(startStr)}/${encodeURIComponent(endStr)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    const data = await handleResponse(response, "Station schedule fetch failed");
    return Array.isArray(data) ? data : [];
  },


  // ---- GET /api/ifmtrains/schedule/{activationId}/{scheduleId} ----
  // fetches the full scheduled route for a specific train
  // returns ordered list of stops/passes with TIPLOCs, location names, lat/lng, and planned times
  getTrainSchedule: async (activationId: number, scheduleId: number): Promise<ScheduleStop[]> => {
    const url = `${API_BASE}/ifmtrains/schedule/${activationId}/${scheduleId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    const data = await handleResponse(response, "Train schedule fetch failed");
    return Array.isArray(data) ? data : [];
  },


  // ---- GET /api/ifmtrains/movement/{activationId}/{scheduleId} ----
  // fetches actual movement data for a train (arrival/departure times at each location)
  // used alongside schedule data to compare planned vs actual times
  getTrainMovement: async (activationId: number, scheduleId: number): Promise<MovementEvent[]> => {
    const url = `${API_BASE}/ifmtrains/movement/${activationId}/${scheduleId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    const data = await handleResponse(response, "Train movement fetch failed");
    return Array.isArray(data) ? data : [];
  }
};
