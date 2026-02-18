import type { Train, TiplocLocation } from '../types';

const API_BASE = "https://traindata-stag-api.railsmart.io/api";
const API_KEY = import.meta.env.VITE_VELOCITI_API_KEY;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-ApiKey': API_KEY
});

export const trainApi = {

  // ---------------- GET SINGLE LOCATION ----------------
  getLocation: async (tiploc: string): Promise<TiplocLocation> => {
    const response = await fetch(`${API_BASE}/Tiploc/TiplocLocations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ Tiplocs: [tiploc.toUpperCase()] })
    });

    if (!response.ok) throw new Error("Location fetch failed");

    const data = await response.json();

    if (!data.tiplocsLocations || data.tiplocsLocations.length === 0) {
      throw new Error("Location not found");
    }

    return data.tiplocsLocations[0];
  },

  // ---------------- GET MULTIPLE LOCATIONS ----------------
  getTiplocLocations: async (tiplocs: string[]): Promise<TiplocLocation[]> => {
    const response = await fetch(`${API_BASE}/Tiploc/TiplocLocations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ Tiplocs: tiplocs.map(t => t.toUpperCase()) })
    });

    if (!response.ok) throw new Error("Multi-location fetch failed");

    const data = await response.json();

    return data.tiplocsLocations || [];
  },

  // ---------------- GET SCHEDULE (FULL DAY) ----------------
  getSchedule: async (tiploc: string): Promise<Train[]> => {

    const today = new Date();

    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const fmt = (d: Date) =>
      d.toISOString().replace('T', ' ').split('.')[0];

    const url = `${API_BASE}/trains/tiploc/${tiploc.toUpperCase()}/${encodeURIComponent(fmt(start))}/${encodeURIComponent(fmt(end))}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) throw new Error("Schedule fetch failed");

    const data = await response.json();

    return Array.isArray(data) ? data : [];
  },

  // ---------------- GET FULL TRAIN ----------------
  getFullSchedule: async (trainId: string) => {
    const response = await fetch(`${API_BASE}/trains/${trainId}`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) throw new Error("Full schedule fetch failed");

    return await response.json();
  }

};






