import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { Box, Spinner } from '@chakra-ui/react';

import { MapContainer, TileLayer, useMap, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

import tiplocDataRaw from '../../data/TiplocPublicExport_2025-12-01_094655.json';
import type { TiplocData } from '../../types';
import MapControls, { MAP_LAYERS } from './mapControls';

// configs
const UK_CENTER: [number, number] = [54.5, -2.5];
const DEFAULT_ZOOM = 6;
const ALL_TIPLOCS = (tiplocDataRaw as any).Tiplocs as TiplocData[];


// interfaces and props
export interface MapTarget {
  lat: number;
  lng: number;
  zoom?: number;
}

interface MapAreaProps {
  targetView?: MapTarget | null;
  selectedTrain?: any | null;
  searchedStation?: string | null;
  setRouteStops: (stops: any[]) => void;
}

interface MapControllerProps {
  targetView?: MapTarget | null;
  selectedTrain?: any | null;
  resetTrigger: number;
}


// handles map movements based on the selected station (tiploc), train and reset map to default view
const MapController = ({
  targetView,
  selectedTrain,
  resetTrigger
}: MapControllerProps) => {
  const map = useMap();

  // when targetView changes, fly to new location with animation
  useEffect(() => {
    if (targetView) {
      map.flyTo([targetView.lat, targetView.lng], targetView.zoom || 14);
    }
  }, [targetView, map]);

  // when selectedTrain changes, find the origin station's location and fly to it
  useEffect(() => {
    if (!selectedTrain) return;

    const foundLocation = ALL_TIPLOCS.find(
      t => t.Tiploc === selectedTrain.originTiploc
    );

    // if location is found and has valid coordinates, fly to it with animation
    if (foundLocation?.Latitude && foundLocation?.Longitude) {
      map.flyTo(
        [foundLocation.Latitude, foundLocation.Longitude],
        15
      );
    }
  }, [selectedTrain, map]);

  // when resetTrigger is clicked, fly back to default UK view with animation
  useEffect(() => {
    if (resetTrigger > 0) {
      map.flyTo(UK_CENTER, DEFAULT_ZOOM, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [resetTrigger, map]);

  return null;
};


// draw the route of the selected train by simulating a path between origin and destination
const RouteRenderer = ({ selectedTrain, setRouteStops}:
  { selectedTrain: any | null; setRouteStops: (stops: any[]) => void;
}) => {

  const map = useMap();
  const [routePositions, setRoutePositions] = useState<[number, number][]>([]);

  // when selectedTrain changes, calculate a simulated route between
  // origin and destination and update route positions and stops
  useEffect(() => {
    if (!selectedTrain) {
      setRoutePositions([]);
      setRouteStops([]);
      return;
    }

    // find the origin and destination tiploc data based on the selected train's
    // origin and destination tiplocs
    const origin = ALL_TIPLOCS.find(
      t => t.Tiploc === selectedTrain.originTiploc
    );

    const destination = ALL_TIPLOCS.find(
      t => t.Tiploc === selectedTrain.destinationTiploc
    );

    // if either origin or destination is not found or has invalid coordinates, exit early
    if (!origin || !destination) return;

    // create a simple simulated route by interpolating points between origin and destination
    const start: [number, number] = [origin.Latitude, origin.Longitude];
    const end: [number, number] = [destination.Latitude, destination.Longitude];

    const generateInterpolatedRoute = (
      start: [number, number],
      end: [number, number],
      segments: number
    ) => {
      const points: [number, number][] = [];
      for (let i = 0; i <= segments; i++) { // include both start and end points
        const lat = start[0] + ((end[0] - start[0]) * i) / segments; // linear interpolation for latitude
        const lng = start[1] + ((end[1] - start[1]) * i) / segments; // linear interpolation for longitude
        points.push([lat, lng]); // add the interpolated point to the route
      }
      return points;
    };

    const simulatedRoute = generateInterpolatedRoute(start, end, 12);
    setRoutePositions(simulatedRoute); // update state with the new route positions

    // create stop details for the route stops based on the simulated route and selected train's origin/destination
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

    setRouteStops(stopDetails); // update the route stops

    // fit the map bounds to the simulated route with some padding for better visibility
    const bounds = L.latLngBounds(simulatedRoute);
    map.fitBounds(bounds, { padding: [50, 50] });

  }, [selectedTrain, map, setRouteStops]);

  if (routePositions.length < 2) return null; // need at least 2 points to draw a route

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

// styles for tiploc markers
const DEFAULT_STATION_STYLE: L.CircleMarkerOptions = { // default style for all stations
  radius: 3,
  color: '#3182ce',
  fillColor: '#63b3ed',
  fillOpacity: 0.8,
  weight: 1
};

const SEARCHED_STATION_STYLE: L.CircleMarkerOptions = { // custom style for searched tiplocs/stations
  radius: 6,
  color: '#e53e3e',
  fillColor: '#fc8181',
  fillOpacity: 0.8,
  weight: 2
};

// layer to show tiploc stations, either all or just the searched station
const TiplocLayer = ({ visible, searchedStation }: { visible: boolean, searchedStation?: string | null }) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return; // safety check for map availability

    let tiplocsToRender: TiplocData[] = []; // default to empty

    // check if we should show all tiplocs or just the searched station, and prepare the list accordingly
    if (visible) {
      tiplocsToRender = ALL_TIPLOCS;
    } else if (searchedStation) {
      const found = ALL_TIPLOCS.find(t => t.Tiploc === searchedStation);
      if (found) tiplocsToRender = [found];
    }

    // clear existing layer before adding new markers
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    // if there are no tiplocs to render, exit early
    if (tiplocsToRender.length === 0) return;

    // create a canvas renderer for better performance with huge amount of markers
    const canvasRenderer = L.canvas({ padding: 0.5 });

    // create markers for each tiploc. special styling for searched station
    const markers = tiplocsToRender.map(t => {
      if (!t.Latitude || !t.Longitude) return null;

      const isSearchedTarget = !visible && searchedStation === t.Tiploc;
      const baseStyle = isSearchedTarget ? SEARCHED_STATION_STYLE : DEFAULT_STATION_STYLE;

      return L.circleMarker([t.Latitude, t.Longitude], { ...baseStyle, renderer: canvasRenderer })
        .bindPopup(`
        <div style="font-family: system-ui;">
          <strong>${t.Name}</strong><br/>
          <small>TIPLOC: ${t.Tiploc}</small>
        </div>
      `);
    }).filter((m): m is L.CircleMarker => m !== null);

    // create a layer group for the markers and add to map
    layerRef.current = L.featureGroup(markers);
    map.addLayer(layerRef.current);

    return () => { // cleanup function to remove layer when unmounting or before next render
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [map, visible, searchedStation]);

  return null;
};

// main map area component
const MapArea = ({
  targetView,
  selectedTrain,
  searchedStation,
  setRouteStops
}: MapAreaProps) => {

  const [activeLayer, setActiveLayer] = useState(MAP_LAYERS.standard);
  const [showTiplocs, setShowTiplocs] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // function to trigger map reset by incrementing the resetTrigger state
  const handleReset = () => setResetTrigger(prev => prev + 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) { // map loading spinner
    return (
      <Box w="full" h="full" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box w="full" h="full" position="relative">
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
          resetTrigger={resetTrigger}
        />

        <TileLayer
          key={activeLayer.name}
          attribution={activeLayer.attribution}
          url={activeLayer.url}
        />

        <TiplocLayer 
          visible={showTiplocs} 
          searchedStation={searchedStation} 
        />

        <RouteRenderer
          selectedTrain={selectedTrain || null}
          setRouteStops={setRouteStops}
        />

        <MapControls
          currentLayer={activeLayer}
          onLayerChange={setActiveLayer}
          onReset={handleReset}
          showTiplocs={showTiplocs}
          onToggleTiplocs={() => setShowTiplocs(!showTiplocs)}
        />
      </MapContainer>
    </Box>
  );
};

export default MapArea;