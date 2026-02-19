export interface TiplocDetails {
  BPlan_TimingPoint: string | null;
  TPS_StationType: string | null;
  TPS_StationCategory: string | null;
  CRS: string | null;
  Nalco: number | null;
  OffNetwork: boolean;
  ForceLPB: string | null;
  CompulsoryStop: boolean;
  UIC: number | null;
  Zone: number | null;
}

export interface TiplocData {
  Name: string;
  Tiploc: string;
  Stanox: number | null;
  InBPlan: boolean;
  InTPS: boolean;
  IsTiploc: boolean;
  Codes: string[];
  Details: TiplocDetails;
  Latitude: number;
  Longitude: number;
}

export interface TiplocExport {
  ExportDate: string;
  ExportCount: number;
  Tiplocs: TiplocData[];
}

export interface Train {
  trainId: string;
  headCode: string;
  toc_Name?: string;
  
  // origin Info
  originTiploc: string;
  originLocation: string;
  scheduledDeparture: string;
  actualDeparture?: string;
  
  // destination Info
  destinationTiploc: string;
  destinationLocation: string;
  scheduledArrival: string;
  actualArrival?: string;
  
  // live status
  lastReportedLocation?: string;
  lastReportedDelay: number;
  lastReportedType: string;
  cancelled: boolean;
}

export interface TiplocLocation {
  id: number;
  tiploc: string;
  latitude: number;
  longitude: number;
  stanox: string;
}