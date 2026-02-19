import type { Train, TiplocLocation } from '../types';

// api configs
const API_BASE = "https://traindata-stag-api.railsmart.io/api";
const API_KEY = import.meta.env.VITE_VELOCITI_API_KEY;


// get headers for API requests
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-ApiKey': API_KEY
});


// handle HTTP errors
const handleResponse = async (response: Response, errorMessage: string) => {
  if (!response.ok) {
    throw new Error(`${errorMessage} (Status: ${response.status})`);
  }
  return response.json();
};


// main API object with methods to fetch train and station data
export const trainApi = {

  // get multiple stations
  getTiplocLocations: async (tiplocs: string[]): Promise<TiplocLocation[]> => {
    if (!tiplocs.length) return [];

    const response = await fetch(`${API_BASE}/Tiploc/TiplocLocations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ Tiplocs: tiplocs.map(t => t.toUpperCase()) })
    });

    const data = await handleResponse(response, "Multi-location fetch failed");
    return data.tiplocsLocations || [];
  },


  // get single station
  getLocation: async (tiploc: string): Promise<TiplocLocation> => {
    const locations = await trainApi.getTiplocLocations([tiploc]);
    
    if (locations.length === 0) {
      throw new Error(`Location not found for TIPLOC: ${tiploc}`);
    }
    
    return locations[0];
  },


  // get station schedule
  getSchedule: async (tiploc: string): Promise<Train[]> => {
    const today = new Date();

    // set start and end times for the API query to cover the whole day
    const dateString = today.toISOString().split('T')[0];
    const startStr = `${dateString} 00:00:00`;
    const endStr = `${dateString} 23:59:59`;

    const url = `${API_BASE}/trains/tiploc/${tiploc.toUpperCase()}/${encodeURIComponent(startStr)}/${encodeURIComponent(endStr)}`;

    // fetch schedule data for the given tiploc and time range
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    // return an empty array if the response is not an array
    const data = await handleResponse(response, "Schedule fetch failed");
    return Array.isArray(data) ? data : [];
  },

  
  // get full schedule for a specific train by its ID (for timeline view)
  getFullSchedule: async <T = any>(trainId: string): Promise<T> => {
    const response = await fetch(`${API_BASE}/trains/${trainId}`, {
      method: 'GET',
      headers: getHeaders()
    });

    return await handleResponse(response, "Full schedule fetch failed");
  }
};