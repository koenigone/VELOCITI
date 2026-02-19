import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { Box, Spinner } from '@chakra-ui/react';

import { MapContainer, TileLayer, useMap, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

import tiplocDataRaw from '../../data/TiplocPublicExport_2025-12-01_094655.json';
import type { TiplocData, Train } from '../../types';
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
  selectedTrain?: Train | null;
  searchedStation?: string | null;
}

interface MapControllerProps extends MapAreaProps {
  resetTrigger: number;
}


// handles map movements based on the selected station (tiploc) or train, also used to reset map to default view
const MapController = ({ targetView, selectedTrain, resetTrigger }: MapControllerProps) => {
  const map = useMap();

  // jump to target view when it changes from search
  useEffect(() => {
    if (targetView) {
      map.flyTo([targetView.lat, targetView.lng], targetView.zoom || 14, { duration: 1.5 });
    }
  }, [targetView, map]);

  // jump to train origin when a train is selected from the sidebar
  useEffect(() => {
    if (!selectedTrain) return;
    const origin = ALL_TIPLOCS.find(t => t.Tiploc === selectedTrain.originTiploc);

    if (origin?.Latitude && origin?.Longitude) {
      map.flyTo([origin.Latitude, origin.Longitude], 13, { duration: 1.5 });
    }
  }, [selectedTrain, map]);

  // reset map to default view when resetTrigger changes
  useEffect(() => {
    if (resetTrigger > 0) {
      map.flyTo(UK_CENTER, DEFAULT_ZOOM, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [resetTrigger, map]);

  return null;
};


// layer to show the train route from origin to destination when a train is selected
const RouteLayer = ({ selectedTrain }: { selectedTrain: Train | null }) => {
  const map = useMap();
  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  useEffect(() => {

    // if no train or missing tiploc info, clear route and exit
    if (!selectedTrain) {
      setRoutePath([]);
      return;
    }

    const { originTiploc, destinationTiploc } = selectedTrain;
    if (!originTiploc || !destinationTiploc) return; // safety check for missing tiploc data

    // find origin and destination tiploc data to get lat/lng for route
    const origin = ALL_TIPLOCS.find(t => t.Tiploc === originTiploc);
    const dest = ALL_TIPLOCS.find(t => t.Tiploc === destinationTiploc);

    if (origin?.Latitude && origin?.Longitude && dest?.Latitude && dest?.Longitude) {
      const path: [number, number][] = [
        [origin.Latitude, origin.Longitude],
        [dest.Latitude, dest.Longitude]
      ];

      setRoutePath(path);
      map.fitBounds(L.latLngBounds(path), { padding: [50, 50], maxZoom: 12 });
    }
  }, [selectedTrain, map]);

  if (routePath.length === 0) return null;

  // render route on the map with start/end markers
  return (
    <>
      <Polyline positions={routePath} pathOptions={{ color: '#e53e3e', weight: 4, dashArray: '10, 10', opacity: 0.8 }} />
      <CircleMarker center={routePath[0]} radius={6} pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 1 }} />
      <CircleMarker center={routePath[routePath.length - 1]} radius={6} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 1 }} />
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
const MapArea = ({ targetView, selectedTrain = null, searchedStation }: MapAreaProps) => {
  const [activeLayer, setActiveLayer] = useState(MAP_LAYERS.standard);
  const [showTiplocs, setShowTiplocs] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);

  // handle map reset by incrementing resetTrigger
  const handleReset = () => setResetTrigger(prev => prev + 1);

  return (
    <Box w="full" h="full" position="relative" id="map-container" bg="gray.100">
      <MapContainer
        center={UK_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        zoomControl={false}
        preferCanvas={true}
        whenReady={() => setIsMapReady(true)}
      >
        <TileLayer key={activeLayer.name} attribution={activeLayer.attribution} url={activeLayer.url} />

        <MapController targetView={targetView} selectedTrain={selectedTrain} resetTrigger={resetTrigger} />

        <TiplocLayer visible={showTiplocs} searchedStation={searchedStation} />
        <RouteLayer selectedTrain={selectedTrain} />

        <MapControls
          currentLayer={activeLayer}
          onLayerChange={setActiveLayer}
          onReset={handleReset}
          showTiplocs={showTiplocs}
          onToggleTiplocs={() => setShowTiplocs(!showTiplocs)}
        />
      </MapContainer>

      {!isMapReady && (
        <Box position="absolute" inset={0} bg="whiteAlpha.900" zIndex={2000} display="flex" alignItems="center" justifyContent="center">
          <Spinner size="xl" color="blue.500" thickness="4px" />
        </Box>
      )}
    </Box>
  );
};

export default MapArea;