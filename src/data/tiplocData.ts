import type { TiplocData } from '../types';
import tiplocDataRaw from './TiplocPublicExport_2025-12-01_094655.json';

// single shared reference to all TIPLOC data — imported once, used everywhere
export const ALL_TIPLOCS = (tiplocDataRaw as any).Tiplocs as TiplocData[];

// lookup helper: find a TIPLOC's display name from the local dataset
export const getTiplocName = (code: string): string => {
  const found = ALL_TIPLOCS.find(t => t.Tiploc === code.toUpperCase());
  return found?.Name || code;
};

// lookup helper: find a TIPLOC entry by its code
export const findTiploc = (code: string): TiplocData | undefined => {
  return ALL_TIPLOCS.find(t => t.Tiploc === code.toUpperCase());
};
