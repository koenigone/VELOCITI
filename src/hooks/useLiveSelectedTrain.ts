import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Train } from '../types';

// live tracking status states
export type LiveTrackingStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'disconnected' | 'unavailable' | 'error';

export interface LiveTrainUpdate {
  trainId?: string;
  activationId?: number;
  scheduleId?: number;
  headCode?: string;
  lastReportedLocation?: string;
  lastReportedDelay?: number;
  lastReportedType?: string;
  cancelled?: boolean;
  actualDeparture?: string;
  actualArrival?: string;
  lastReportedLatitude?: number;
  lastReportedLongitude?: number;
}

const SOCKET_URL = import.meta.env?.VITE_VELOCITI_SOCKET_URL;


// merges live socket updates into the existing selected train object
export const mergeLiveTrain = (train: Train, update: LiveTrainUpdate): Train => {
  return {
    ...train,
    headCode: update.headCode ?? train.headCode,
    lastReportedLocation: update.lastReportedLocation ?? train.lastReportedLocation,
    lastReportedDelay: typeof update.lastReportedDelay === 'number' ? update.lastReportedDelay : train.lastReportedDelay,
    lastReportedType: update.lastReportedType ?? train.lastReportedType,
    cancelled: typeof update.cancelled === 'boolean' ? update.cancelled : train.cancelled,
    actualDeparture: update.actualDeparture ?? train.actualDeparture,
    actualArrival: update.actualArrival ?? train.actualArrival,
    lastReportedLatitude: typeof update.lastReportedLatitude === 'number' ? update.lastReportedLatitude : train.lastReportedLatitude,
    lastReportedLongitude: typeof update.lastReportedLongitude === 'number' ? update.lastReportedLongitude : train.lastReportedLongitude,
  };
};

// identifies whether a socket payload belongs to the current selected train
export const isLiveUpdateForTrain = (train: Train, update: LiveTrainUpdate): boolean => {
  if (update.trainId) {
    return update.trainId === train.trainId;
  }

  return update.activationId === train.activationId && update.scheduleId === train.scheduleId;
};


// handles socket live updates for the currently selected train only
const useLiveSelectedTrain = (
  selectedTrain: Train | null,
  onLiveUpdate: (updatedTrain: Train) => void
) => {
  const [socketStatus, setSocketStatus] = useState<LiveTrackingStatus>('idle');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedTrainRef = useRef<Train | null>(selectedTrain);
  const trainId = selectedTrain?.trainId;
  const activationId = selectedTrain?.activationId;
  const scheduleId = selectedTrain?.scheduleId;
  const headCode = selectedTrain?.headCode;

  useEffect(() => {
    selectedTrainRef.current = selectedTrain;
  }, [selectedTrain]);

  useEffect(() => {
    if (!trainId || !activationId || !scheduleId || !SOCKET_URL) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    queueMicrotask(() => {
      setSocketStatus('connecting');
    });

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    const subscription = {
      trainId,
      activationId,
      scheduleId,
      headCode,
    };

    // these event names should match the backend socket contract
    socket.on('connect', () => {
      queueMicrotask(() => {
      setSocketStatus('connecting');
    });
      socket.emit('train:subscribe', subscription);
    });

    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
    });

    socket.io.on('reconnect_attempt', () => {
      setSocketStatus('reconnecting');
    });

    socket.on('connect_error', () => {
      setSocketStatus('error');
    });

    socket.on('train:update', (payload: LiveTrainUpdate) => {
      const activeTrain = selectedTrainRef.current;
      if (!activeTrain) return;

      if (!isLiveUpdateForTrain(activeTrain, payload)) return;

      setSocketStatus('live');
      setLastUpdated(new Date());
      onLiveUpdate(mergeLiveTrain(activeTrain, payload));
    });

    socket.on('live:error', () => {
      setSocketStatus('error');
    });

    return () => {
      socket.emit('train:unsubscribe', subscription);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocketStatus('idle');
      setLastUpdated(null);
    };
  }, [trainId, activationId, scheduleId, headCode, onLiveUpdate]);

  const liveStatus: LiveTrackingStatus = !trainId || !activationId || !scheduleId
    ? 'idle'
    : !SOCKET_URL
      ? 'unavailable'
      : socketStatus;

  return { liveStatus, lastUpdated, setLastUpdated };
};

export default useLiveSelectedTrain;