import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { Box, Button, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { MapContainer, TileLayer, useMap, Polyline, CircleMarker } from 'react-leaflet';
import { trainApi } from '../../api/api';
import { FaLayerGroup } from "react-icons/fa";
import { MdOutlineZoomInMap } from "react-icons/md";
import L from 'leaflet';
import tiplocDataRaw from '../../data/TiplocPublicExport_2025-12-01_094655.json';
import type { TiplocData, MapTarget } from '../../types';

// ---------------- CONFIG ----------------
const UK_CENTER: [number, number] = [54.5, -2.5];
const DEFAULT_ZOOM = 6;
const tiplocs = (tiplocDataRaw as any).Tiplocs as TiplocData[];

// ---------------- MAP LAYERS ----------------
const MAP_LAYERS = {
  standard: {
    name: "Standard",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  openStreet: {
    name: "Open Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap'
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri'
  },
  dark: {
    name: "Dark Mode",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
};

// ---------------- MAP CONTROLLER ----------------
const MapController = ({
  targetView,
  selectedTrain
}: {
  targetView: MapTarget | null,
  selectedTrain: any | null
}) => {
  const map = useMap();

  // Zoom to searched station
  useEffect(() => {
    if (targetView) {
      map.flyTo([targetView.lat, targetView.lng], targetView.zoom || 14);
    }
  }, [targetView, map]);

  // Zoom to selected train origin
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
const RouteRenderer = ({ selectedTrain }: { selectedTrain: any | null }) => {
  const map = useMap();
  const [routePositions, setRoutePositions] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!selectedTrain) {
      setRoutePositions([]);
      return;
    }

    const fetchRoute = async () => {
      try {

        const origin = selectedTrain.originTiploc;
        const destination = selectedTrain.destinationTiploc;

        if (!origin || !destination) return;

        // Resolve origin + destination to coordinates
        const locations = await trainApi.getTiplocLocations([origin, destination]);

        const coords: [number, number][] = locations.map((loc: any) => [
          loc.latitude,
          loc.longitude
        ]);

        setRoutePositions(coords);

        if (coords.length > 1) {
          const bounds = L.latLngBounds(coords);
          map.fitBounds(bounds, { padding: [50, 50] });
        }

      } catch (err) {
        console.error("Route rendering failed:", err);
      }
    };

    fetchRoute();

  }, [selectedTrain, map]);

  if (routePositions.length < 2) return null;

  return (
    <>
      {routePositions.map((pos, index) => (
        <CircleMarker
          key={index}
          center={pos}
          radius={6}
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
          weight: 6,
          opacity: 0.95
        }}
      />
    </>
  );
};

// ---------------- TIPLOC CANVAS ----------------
const TiplocCanvasLayer = () => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const renderer = L.canvas({ padding: 0.5 });

    const markers = tiplocs
      .map((t) => {
        if (!t.Latitude || !t.Longitude) return null;

        return L.circleMarker([t.Latitude, t.Longitude], {
          renderer,
          radius: 4,
          color: '#3388ff',
          fillColor: '#3388ff',
          fillOpacity: 0.8,
          weight: 1
        });
      })
      .filter((m): m is L.CircleMarker => m !== null);

    const layerGroup = L.featureGroup(markers).addTo(map);
    return () => layerGroup.remove();

  }, [map]);

  return null;
};

// ---------------- MAIN MAP ----------------
interface MapAreaProps {
  targetView?: MapTarget | null;
  selectedTrain?: any | null;
}

const MapArea = ({ targetView, selectedTrain }: MapAreaProps) => {
  const [activeLayer, setActiveLayer] = useState(MAP_LAYERS.standard);

  return (
    <Box w="full" h="full" position="relative" id="map-container">
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
          key={activeLayer.name}
          attribution={activeLayer.attribution}
          url={activeLayer.url}
        />

        <TiplocCanvasLayer />

        <RouteRenderer selectedTrain={selectedTrain || null} />
      </MapContainer>
    </Box>
  );
};

export default MapArea;


