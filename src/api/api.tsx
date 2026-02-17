import type { Train, TiplocLocation } from '../types';

const API_BASE = "https://traindata-stag-api.railsmart.io/api";
const API_KEY = import.meta.env.VITE_VELOCITI_API_KEY;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-ApiKey': API_KEY
});

export const trainApi = {
  getLocation: async (tiploc: string): Promise<TiplocLocation> => { // fetch lat/lng for a given tiploc code (station)
    const response = await fetch(`${API_BASE}/Tiploc/TiplocLocations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ Tiplocs: [tiploc.toUpperCase()] })
    });

    if (!response.ok) throw new Error(`Location fetch failed: ${response.statusText}`);

    const data = await response.json();

    // validate response structure matches docs
    if (!data.tiplocsLocations || data.tiplocsLocations.length === 0) {
      throw new Error("Location not found");
    }

    return data.tiplocsLocations[0];
  },

  // fetches the train schedule for a specific station for the next 12 hours
  getSchedule: async (tiploc: string): Promise<Train[]> => {
    const now = new Date();
    const end = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now

    // format date
    const fmt = (d: Date) => d.toISOString().replace('T', ' ').split('.')[0];

    const url = `${API_BASE}/trains/tiploc/${tiploc.toUpperCase()}/${encodeURIComponent(fmt(now))}/${encodeURIComponent(fmt(end))}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) throw new Error(`Schedule fetch failed: ${response.statusText}`);

    return await response.json();
  }
};