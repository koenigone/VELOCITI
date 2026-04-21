import type { TiplocData } from '../types';
import tiplocDataRaw from './TiplocPublicExport_2025-12-01_094655.json';

// single shared reference to all TIPLOC data, imported once, used everywhere
const tiplocExport = tiplocDataRaw as { Tiplocs: TiplocData[] };
export const ALL_TIPLOCS = tiplocExport.Tiplocs;

// major UK rail hub TIPLOCs used for nationwide headcode searching
// most trains pass through at least one of these, giving good coverage
// without needing to scan thousands of stations (which causes CORS/URL-length failures)
export const HEADCODE_SEARCH_HUBS = [
  // London terminals
  'EUSTON', 'KNGX', 'PADTON', 'VICTRIA', 'WATRLMN', 'LIVST', 'STPX',
  'FENCHRS', 'LNDNBDG', 'CHRX', 'STFD',
  // major junctions
  'CREWE', 'DONC', 'YORK', 'PBRO', 'RDNGSTN',
  // major cities
  'BHAMNWS', 'MNCRPIC', 'LEEDS', 'SHEFFLD', 'EDINBUR', 'GLGC',
  'CRDFCEN', 'BRSTLTM', 'NWCSTLE', 'NTNG', 'PLYMTH', 'EXETRSD',
  'LVRPLSH', 'PRST', 'DRBY', 'LESTER', 'ABRDEEN', 'IVRNESS',
  'SOTON', 'GTWK', 'BRGHTN', 'NRCH', 'CAMBDGE', 'SDON',
];

// find a TIPLOC's display name from the local dataset
export const getTiplocName = (code: string): string => {
  const found = ALL_TIPLOCS.find(t => t.Tiploc === code.toUpperCase());
  return found?.Name || code;
};

// find a TIPLOC entry by its code
export const findTiploc = (code: string): TiplocData | undefined => {
  return ALL_TIPLOCS.find(t => t.Tiploc === code.toUpperCase());
};