import type { Train } from '../types';

export interface TrainStatus {
  color: string;
  badgeScheme: string;
  label: string;
}

/* determines the display status of a train based on its properties
   returns an object with the appropriate color, badge scheme, and label for UI display
   priority: cancelled > late > terminated (only if journey time has realistically elapsed) > on time

   the bulk station API often returns lastReportedType "TERMINATED" for trains that are
   still running. we cross-reference against scheduledArrival to avoid false terminations:
   a train can only be marked TERMINATED if its scheduled arrival + a delay buffer has passed.
*/
const TERMINATED_BUFFER_MS = 60 * 60 * 1000; // 60 min buffer past scheduled arrival

const isJourneyComplete = (train: Train): boolean => {
  if (!train.scheduledArrival) return false;

  const arrival = new Date(train.scheduledArrival).getTime();
  if (isNaN(arrival)) return false;

  return Date.now() > arrival + TERMINATED_BUFFER_MS;
};

export const getTrainStatus = (train: Train): TrainStatus => {
  if (train.cancelled) return { color: "red.600", badgeScheme: "red", label: "CANCELLED" };
  if (isJourneyComplete(train)) return { color: "gray.500", badgeScheme: "gray", label: "TERMINATED" };
  if (train.lastReportedDelay > 4) return { color: "red.500", badgeScheme: "red", label: `${train.lastReportedDelay} MINS LATE` };
  return { color: "green.500", badgeScheme: "green", label: "ON TIME" };
};


/* format ISO datetime string to HH:MM for display
   returns "--:--" if the input is invalid or missing
*/
export const formatTime = (isoString?: string | null): string => {
  if (!isoString) return "--:--";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


/* format a 4-digit time string (e.g. "1433") to "14:33" display format
   used for schedule API responses which return times as "HHmm"
*/
export const formatScheduleTime = (timeStr?: string | null): string => {
  if (!timeStr) return "--:--";

  // fallback timeline entries can contain full ISO datetimes instead of HHmm strings
  if (timeStr.includes('T')) {
    return formatTime(timeStr);
  }

  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
  }

  if (timeStr.length < 3) return "--:--";

  // pad to 4 digits if needed (e.g. "933" -> "0933")
  const padded = timeStr.padStart(4, '0');
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
};


/* calculates delay in minutes between scheduled and actual time
   returns null if either time is missing or invalid
*/
export const calculateDelay = (scheduled?: string | null, actual?: string | null): number | null => {
  if (!scheduled || !actual) return null;

  const s = new Date(scheduled).getTime();
  const a = new Date(actual).getTime();

  if (isNaN(s) || isNaN(a)) return null;

  return Math.round((a - s) / 60000);
};