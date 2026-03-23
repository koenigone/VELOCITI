import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);

const FRONTEND_ORIGIN = 'http://localhost:5173';
const PORT = 3001;
const API_BASE =
  process.env.VELOCITI_API_BASE_URL ||
  'https://traindata-stag-api.railsmart.io';

const API_KEY =
  process.env.VELOCITI_API_KEY ||
  process.env.VITE_VELOCITI_API_KEY;

const POLL_INTERVAL_MS = 15000;

app.use(cors({ origin: FRONTEND_ORIGIN }));

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

const activeSubscriptions = new Map();

const normaliseLocation = (value = '') =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const getJson = async (path) => {
  if (!API_KEY) {
    throw new Error('Missing API key for live update server');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'X-ApiKey': API_KEY,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const getLatestMovementEvent = (movementData) => {
  if (!Array.isArray(movementData) || movementData.length === 0) {
    return null;
  }

  const eventsWithActualTimes = movementData.filter(
    (event) => event.actual || event.actualArrival || event.actualDeparture
  );

  if (eventsWithActualTimes.length > 0) {
    return eventsWithActualTimes[eventsWithActualTimes.length - 1];
  }

  return movementData[movementData.length - 1];
};

const findScheduleLocationMatch = (scheduleData, movementLocation) => {
  if (!Array.isArray(scheduleData) || scheduleData.length === 0) {
    return undefined;
  }

  if (!movementLocation) {
    return undefined;
  }

  const target = normaliseLocation(movementLocation);

  return scheduleData.find(
    (stop) =>
      normaliseLocation(stop.location) === target ||
      normaliseLocation(stop.tiploc) === target
  );
};

const buildLiveUpdate = async (subscription) => {
  const {
    trainId,
    activationId,
    scheduleId,
    headCode,
    originTiploc,
    destinationTiploc,
  } = subscription;

  const [scheduleData, movementData] = await Promise.all([
    getJson(`/api/ifmtrains/schedule/${activationId}/${scheduleId}`),
    getJson(`/api/ifmtrains/movement/${activationId}/${scheduleId}`),
  ]);

  const latestEvent = getLatestMovementEvent(movementData);

  const firstStop = Array.isArray(scheduleData) && scheduleData.length > 0
    ? scheduleData[0]
    : undefined;

  const lastStop = Array.isArray(scheduleData) && scheduleData.length > 0
    ? scheduleData[scheduleData.length - 1]
    : undefined;

  if (!latestEvent) {
    return {
      trainId,
      activationId,
      scheduleId,
      headCode,
      originTiploc,
      destinationTiploc,
      lastReportedLocation: firstStop?.location || '',
      lastReportedDelay: 0,
      lastReportedType: 'NO_UPDATE',
      lastReportedLatitude: firstStop?.latLong?.latitude,
      lastReportedLongitude: firstStop?.latLong?.longitude,
    };
  }

  const eventType = String(latestEvent.eventType || '').toUpperCase();
  const matchedStop = findScheduleLocationMatch(scheduleData, latestEvent.location);

  let fallbackStop = matchedStop;

  if (!fallbackStop) {
    if (eventType === 'ACTIVATED' || eventType === 'ORIGIN' || eventType === 'DEPARTURE') {
      fallbackStop = firstStop;
    } else if (eventType === 'ARRIVAL' || eventType === 'DESTINATION') {
      fallbackStop = lastStop;
    }
  }

  return {
    trainId,
    activationId,
    scheduleId,
    headCode,
    originTiploc,
    destinationTiploc,
    lastReportedLocation:
      latestEvent.location ||
      fallbackStop?.location ||
      '',
    lastReportedDelay:
      typeof latestEvent.variation === 'number' ? latestEvent.variation : 0,
    lastReportedType: latestEvent.eventType,
    actualDeparture: latestEvent.actualDeparture,
    actualArrival: latestEvent.actualArrival,
    lastReportedLatitude: fallbackStop?.latLong?.latitude,
    lastReportedLongitude: fallbackStop?.latLong?.longitude,
  };
};

const clearSubscription = (socketId) => {
  const existing = activeSubscriptions.get(socketId);

  if (existing) {
    clearInterval(existing.intervalId);
    activeSubscriptions.delete(socketId);
  }
};

io.on('connection', (socket) => {
  socket.on('train:subscribe', async (subscription) => {
    clearSubscription(socket.id);

    if (!subscription?.activationId || !subscription?.scheduleId) {
      socket.emit('live:error', {
        message: 'Missing activationId or scheduleId',
      });
      return;
    }

    const sendUpdate = async () => {
      try {
        const update = await buildLiveUpdate(subscription);
        socket.emit('train:update', update);
      } catch (error) {
        socket.emit('live:error', {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to fetch live train updates',
        });
      }
    };

    await sendUpdate();

    const intervalId = setInterval(sendUpdate, POLL_INTERVAL_MS);

    activeSubscriptions.set(socket.id, {
      intervalId,
      subscription,
    });
  });

  socket.on('train:unsubscribe', () => {
    clearSubscription(socket.id);
  });

  socket.on('disconnect', () => {
    clearSubscription(socket.id);
  });
});

app.get('/', (_req, res) => {
  res.send('VELOCITI live socket server is running');
});

server.listen(PORT, () => {
  console.log(`Socket server running on http://localhost:${PORT}`);
});