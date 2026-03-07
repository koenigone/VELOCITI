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

export interface TiplocLocation {
  id: number;
  tiploc: string;
  latitude: number;
  longitude: number;
  stanox: string;
}


// train types
export interface Train {
  trainId: string;
  headCode: string;
  toc_Name?: string;

  // origin info
  originTiploc: string;
  originLocation: string;
  scheduledDeparture: string;
  actualDeparture?: string;

  // destination info
  destinationTiploc: string;
  destinationLocation: string;
  scheduledArrival: string;
  actualArrival?: string;

  // live status
  lastReportedLocation?: string;
  lastReportedDelay: number;
  lastReportedType: string;
  cancelled: boolean;

  // IDs needed for fetching full schedule and movement data
  activationId: number;
  scheduleId: number;
}


// schedule API response
export interface ScheduleStop {
  tiploc: string;
  location: string;
  latLong: {
    latitude: number;
    longitude: number;
  };
  // only one of these will be present per stop
  departure?: string;  // "HHmm" format - origin and intermediate departures
  arrival?: string;    // "HHmm" format - destination and intermediate arrivals
  pass?: string;       // "HHmm" format - pass-through timing points
}


// movement API response
export interface MovementEvent {
  location: string;
  eventType: "ARRIVAL" | "DEPARTURE" | "DESTINATION" | "ORIGIN";
  planned: string;            // ISO datetime
  actual: string;             // ISO datetime
  variation: number;          // delay in minutes (0 = on time)
  plannedDeparture?: string;  // ISO datetime
  actualDeparture?: string;   // ISO datetime
}


// timeline stop
export interface TimelineStop {
  tiploc: string;
  name: string;
  latitude: number;
  longitude: number;
  scheduledTime: string | null;  // the relevant time for this stop (depart/arrive/pass)
  actualTime: string | null;     // actual time from movement data
  variation: number | null;      // delay in minutes
  eventType: "departure" | "arrival" | "pass";
  isPass: boolean;
}