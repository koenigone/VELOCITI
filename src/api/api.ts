import type { Train, TiplocLocation, ScheduleStop, MovementEvent } from '../types';

// api config
const API_BASE = "https://traindata-stag-api.railsmart.io/api";
const API_KEY = import.meta.env?.VITE_VELOCITI_API_KEY;


// shared headers for all API requests
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-ApiKey': API_KEY
});


// shared response handler, throws on HTTP errors, returns parsed JSON
const handleResponse = async (response: Response, context: string) => {
  if (!response.ok) {
    throw new Error(`${context} (Status: ${response.status})`);
  }
  return response.json();
};


// gets today's date range in the format required by the train endpoints
const getTodayRange = () => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  return {
    startStr: `${dateStr} 00:00:00`,
    endStr: `${dateStr} 23:59:59`
  };
};


// main API object with methods for all endpoints
export const trainApi = {

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


  // fetches train data for one or more TIPLOCs within today's date range
  getTrainsAtTiplocs: async (tiplocs: string[]): Promise<Train[]> => {
    const uniqueTiplocs = [...new Set(tiplocs.map(t => t.toUpperCase().trim()).filter(Boolean))];
    if (!uniqueTiplocs.length) return [];

    const { startStr, endStr } = getTodayRange();
    const url = `${API_BASE}/trains/tiploc/${uniqueTiplocs.join(',')}/${encodeURIComponent(startStr)}/${encodeURIComponent(endStr)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    const data = await handleResponse(response, "Station schedule fetch failed");
    return Array.isArray(data) ? data : [];
  },


  // fetches train data for a single TIPLOC within today's date range
  getTrainsAtStation: async (tiploc: string): Promise<Train[]> => {
    return trainApi.getTrainsAtTiplocs([tiploc]);
  },


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