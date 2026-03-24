import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

// Render assigns its own port via process.env.PORT (default 10000)
const PORT = process.env.PORT || 3001;

const API_BASE =
  process.env.VELOCITI_API_BASE_URL ||
  'https://traindata-stag-api.railsmart.io';

const API_KEY =
  process.env.VELOCITI_API_KEY ||
  process.env.VITE_VELOCITI_API_KEY;

const POLL_INTERVAL_MS = 15000;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3001',
];

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
});


// serve the built Vite frontend in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));


// socket.io live train logic
const activeSubscriptions = new Map();

const normaliseLocation = (value = '') =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const getJson = async (apiPath) => {
  if (!API_KEY) {
    throw new Error('Missing API key for live update server');
  }

  const response = await fetch(`${API_BASE}${apiPath}`, {
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
  if (!Array.isArray(scheduleData) || !movementLocation) {
    return undefined;
  }

  const target = normaliseLocation(movementLocation);

  return scheduleData.find(
    (stop) => normaliseLocation(stop.location) === target
  );
};

const buildLiveUpdate = async (subscription) => {
  const { trainId, activationId, scheduleId, headCode } = subscription;

  const [scheduleData, movementData] = await Promise.all([
    getJson(`/api/ifmtrains/schedule/${activationId}/${scheduleId}`),
    getJson(`/api/ifmtrains/movement/${activationId}/${scheduleId}`),
  ]);

  const latestEvent = getLatestMovementEvent(movementData);

  if (!latestEvent) {
    return {
      trainId,
      activationId,
      scheduleId,
      headCode,
    };
  }

  const matchedStop = findScheduleLocationMatch(scheduleData, latestEvent.location);

  return {
    trainId,
    activationId,
    scheduleId,
    headCode,
    lastReportedLocation: latestEvent.location,
    lastReportedDelay:
      typeof latestEvent.variation === 'number' ? latestEvent.variation : 0,
    lastReportedType: latestEvent.eventType,
    actualDeparture: latestEvent.actualDeparture,
    actualArrival: latestEvent.actualArrival,
    lastReportedLatitude: matchedStop?.latLong?.latitude,
    lastReportedLongitude: matchedStop?.latLong?.longitude,
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

// fallback: any non-API/non-socket route serves
app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VELOCITI server running on port ${PORT}`);
});