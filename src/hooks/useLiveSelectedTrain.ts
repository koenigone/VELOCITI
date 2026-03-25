import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Train } from '../types';

export type LiveTrackingStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'disconnected' | 'unavailable' | 'error';

interface LiveTrainUpdate {
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

// in dev, VITE_VELOCITI_SOCKET_URL points to the local socket server (e.g. http://localhost:3001)
// in production, it's left empty/unset — socket.io-client auto-connects to the same origin
const SOCKET_URL = import.meta.env.VITE_VELOCITI_SOCKET_URL || undefined;


// merges live socket updates into the existing selected train object
const mergeLiveTrain = (train: Train, update: LiveTrainUpdate): Train => {
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


// handles socket live updates for the currently selected train only
const useLiveSelectedTrain = (
  selectedTrain: Train | null,
  onLiveUpdate: (updatedTrain: Train) => void
) => {
  const [liveStatus, setLiveStatus] = useState<LiveTrackingStatus>('idle');
  const socketRef = useRef<Socket | null>(null);
  const selectedTrainRef = useRef<Train | null>(selectedTrain);

  useEffect(() => {
    selectedTrainRef.current = selectedTrain;
  }, [selectedTrain]);

  useEffect(() => {
    if (!selectedTrain) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setLiveStatus('idle');
      return;
    }

    setLiveStatus('connecting');

    const socket = io(SOCKET_URL || window.location.origin, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    const subscription = {
      trainId: selectedTrain.trainId,
      activationId: selectedTrain.activationId,
      scheduleId: selectedTrain.scheduleId,
      headCode: selectedTrain.headCode,
    };

    // these event names should match the backend socket contract
    socket.on('connect', () => {
      setLiveStatus('live');
      socket.emit('train:subscribe', subscription);
    });

    socket.on('disconnect', () => {
      setLiveStatus('disconnected');
    });

    socket.io.on('reconnect_attempt', () => {
      setLiveStatus('reconnecting');
    });

    socket.on('connect_error', () => {
      setLiveStatus('error');
    });

    socket.on('train:update', (payload: LiveTrainUpdate) => {
      const activeTrain = selectedTrainRef.current;
      if (!activeTrain) return;

      const sameTrain = payload.trainId
        ? payload.trainId === activeTrain.trainId
        : payload.activationId === activeTrain.activationId && payload.scheduleId === activeTrain.scheduleId;

      if (!sameTrain) return;

      onLiveUpdate(mergeLiveTrain(activeTrain, payload));
    });

    return () => {
      socket.emit('train:unsubscribe', subscription);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setLiveStatus('idle');
    };
  }, [selectedTrain?.trainId, selectedTrain?.activationId, selectedTrain?.scheduleId, selectedTrain?.headCode, onLiveUpdate]);

  return { liveStatus, lastUpdated, setLastUpdated };
};

export default useLiveSelectedTrain;