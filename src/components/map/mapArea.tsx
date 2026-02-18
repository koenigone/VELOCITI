import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { Box, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { MapContainer, TileLayer, useMap, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import tiplocDataRaw from '../../data/TiplocPublicExport_2025-12-01_094655.json';
import type { TiplocData, MapTarget } from '../../types';

const UK_CENTER: [number, number] = [54.5, -2.5];
const DEFAULT_ZOOM = 6;
const tiplocs = (tiplocDataRaw as any).Tiplocs as TiplocData[];

// ---------------- MAP CONTROLLER ----------------
const MapController = ({
  targetView,
  selectedTrain
}: {
  targetView: MapTarget | null;
  selectedTrain: any | null;
}) => {
  const map = useMap();

  useEffect(() => {
    if (targetView) {
      map.flyTo([targetView.lat, targetView.lng], targetView.zoom || 14);
    }
  }, [targetView, map]);

  useEffect(() => {
    if (!selectedTrain) return;

    const foundLocation = tiplocs.find(
      t => t.Tiploc === selectedTrain.originTiploc
    );

    if (foundLocation?.Latitude && foundLocation?.Longitude) {
      map.flyTo(
        [foundLocation.Latitude, foundLocation.Longitude],
        15
      );
    }
  }, [selectedTrain, map]);

  return null;
};

// ---------------- ROUTE RENDERER ----------------
const RouteRenderer = ({
  selectedTrain,
  setRouteStops
}: {
  selectedTrain: any | null;
  setRouteStops: (stops: any[]) => void;
}) => {

  const map = useMap();
  const [routePositions, setRoutePositions] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!selectedTrain) {
      setRoutePositions([]);
      setRouteStops([]);
      return;
    }

    const origin = tiplocs.find(
      t => t.Tiploc === selectedTrain.originTiploc
    );

    const destination = tiplocs.find(
      t => t.Tiploc === selectedTrain.destinationTiploc
    );

    if (!origin || !destination) return;

    const start: [number, number] = [origin.Latitude, origin.Longitude];
    const end: [number, number] = [destination.Latitude, destination.Longitude];

    const generateInterpolatedRoute = (
      start: [number, number],
      end: [number, number],
      segments: number
    ) => {
      const points: [number, number][] = [];
      for (let i = 0; i <= segments; i++) {
        const lat = start[0] + ((end[0] - start[0]) * i) / segments;
        const lng = start[1] + ((end[1] - start[1]) * i) / segments;
        points.push([lat, lng]);
      }
      return points;
    };

    const simulatedRoute = generateInterpolatedRoute(start, end, 12);

    setRoutePositions(simulatedRoute);

    const stopDetails = simulatedRoute.map((_, index) => ({
      name:
        index === 0
          ? selectedTrain.originLocation
          : index === simulatedRoute.length - 1
          ? selectedTrain.destinationLocation
          : `Intermediate Stop ${index}`,
      type:
        index === 0
          ? "ORIGIN"
          : index === simulatedRoute.length - 1
          ? "DESTINATION"
          : "INTERMEDIATE"
    }));

    setRouteStops(stopDetails);

    const bounds = L.latLngBounds(simulatedRoute);
    map.fitBounds(bounds, { padding: [50, 50] });

  }, [selectedTrain, map, setRouteStops]);

  if (routePositions.length < 2) return null;

  return (
    <>
      {routePositions.map((pos, index) => (
        <CircleMarker
          key={index}
          center={pos}
          radius={5}
          pathOptions={{
            color: "#f6ad55",
            fillColor: "#f6ad55",
            fillOpacity: 1
          }}
        />
      ))}

      <Polyline
        positions={routePositions}
        pathOptions={{
          color: "#e53e3e",
          weight: 5,
          opacity: 0.95
        }}
      />
    </>
  );
};

// ---------------- MAIN MAP ----------------
interface MapAreaProps {
  targetView?: MapTarget | null;
  selectedTrain?: any | null;
  setRouteStops: (stops: any[]) => void;
}

const MapArea = ({
  targetView,
  selectedTrain,
  setRouteStops
}: MapAreaProps) => {

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Box w="full" h="full" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box w="full" h="full" p="6">
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box w="full" h="full">
      <MapContainer
        center={UK_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl={false}
        preferCanvas
      >
        <MapController
          targetView={targetView || null}
          selectedTrain={selectedTrain || null}
        />

        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <RouteRenderer
          selectedTrain={selectedTrain || null}
          setRouteStops={setRouteStops}
        />

      </MapContainer>
    </Box>
  );
};

export default MapArea;

