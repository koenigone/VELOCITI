import type { TiplocData } from '../types';
import tiplocDataRaw from './TiplocPublicExport_2025-12-01_094655.json';

// single shared reference to all TIPLOC data — imported once, used everywhere
const tiplocExport = tiplocDataRaw as { Tiplocs: TiplocData[] };
export const ALL_TIPLOCS = tiplocExport.Tiplocs;

// passenger station TIPLOCs used for nationwide headcode searching
export const SEARCHABLE_STATION_TIPLOCS = ALL_TIPLOCS
  .filter(t => t.Latitude && t.Longitude)
  .filter(t => !t.Tiploc.startsWith('ELOC'))
  .filter(t => !!t.Details?.CRS)
  .map(t => t.Tiploc);

// lookup helper: find a TIPLOC's display name from the local dataset
export const getTiplocName = (code: string): string => {
  const found = ALL_TIPLOCS.find(t => t.Tiploc === code.toUpperCase());
  return found?.Name || code;
};

// lookup helper: find a TIPLOC entry by its code
export const findTiploc = (code: string): TiplocData | undefined => {
  return ALL_TIPLOCS.find(t => t.Tiploc === code.toUpperCase());
};
