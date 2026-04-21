import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ALL_TIPLOCS } from '../../data/tiplocData';
import type { TiplocData, Train } from '../../types';
import MapControls from './mapControls';
import { MAP_LAYERS } from './mapLayers';
import RouteRenderer from './routeRenderer'
import { DEFAULT_STATION_STYLE, SEARCHED_STATION_ICON } from './markers';
import { MapSpinner } from '../spinners';

// configs
const UK_CENTER: [number, number] = [54.5, -2.5];
const DEFAULT_ZOOM = 6;

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
  onStationSelect?: (station: TiplocData) => void;
}

interface MapControllerProps {
  targetView?: MapTarget | null;
  resetTrigger: number;
}


// handles map movements based on the selected station (tiploc) and reset map to default view
const MapController = ({ targetView, resetTrigger }: MapControllerProps) => {
  const map = useMap();

  // when targetView changes, fly to new location with animation
  useEffect(() => {
    if (targetView) {
      map.setView([targetView.lat, targetView.lng], targetView.zoom || 14);
    }
  }, [targetView, map]);

  // when resetTrigger is clicked, fly back to default UK view with animation
  useEffect(() => {
    if (resetTrigger > 0) {
      map.flyTo(UK_CENTER, DEFAULT_ZOOM, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [resetTrigger, map]);

  return null;
};

/* layer to show tiploc stations, either all or just the searched station
* uses a ref for onStationSelect to prevent the entire layer being torn down
* and rebuilt on every parent re-render (which was causing the memory leak / grey screen)
*/
const TiplocLayer = ({
  visible,
  searchedStation,
  onStationSelect
}: {
  visible: boolean;
  searchedStation?: string | null;
  onStationSelect?: (station: TiplocData) => void;
}) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  // keep callback in a ref so it's always current without triggering the effect
  const onStationSelectRef = useRef(onStationSelect);
  useEffect(() => {
    onStationSelectRef.current = onStationSelect;
  });

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
      layerRef.current = null;
    }

    // if there are no tiplocs to render, exit early
    if (tiplocsToRender.length === 0) return;

    // create a canvas renderer for better performance with huge amount of markers
    const canvasRenderer = L.canvas({ padding: 0.5 });

    // create markers for each tiploc. special styling for searched station
    const markers = tiplocsToRender.map(t => {
      if (!t.Latitude || !t.Longitude) return null;

      const isSearchedTarget = !visible && searchedStation === t.Tiploc;
      const latlng: L.LatLngExpression = [t.Latitude, t.Longitude];

      // create the specific marker type based on whether it's the searched icon or a dot
      const marker = isSearchedTarget
        ? L.marker(latlng, { icon: SEARCHED_STATION_ICON })
        : L.circleMarker(latlng, { ...DEFAULT_STATION_STYLE, renderer: canvasRenderer });

      return marker.bindTooltip(`
        <div style="font-family: system-ui;">
          <strong>${t.Name}</strong><br/>
          <small>TIPLOC: ${t.Tiploc}</small>
        </div>
        `).on('click', () => {
        onStationSelectRef.current?.(t);
      });
    }).filter((m): m is L.Marker | L.CircleMarker => m !== null); // update type filter
    // create a layer group for the markers and add to map
    layerRef.current = L.featureGroup(markers);
    map.addLayer(layerRef.current);

    return () => { // cleanup function to remove layer when unmounting or before next render
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, visible, searchedStation]); // onStationSelect deliberately excluded, accessed via ref

  return null;
};

// main map area component
const MapArea = ({
  targetView,
  selectedTrain,
  searchedStation,
  onStationSelect,
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
      <MapSpinner />
    );
  }

  return (
    <Box w="full" h="full" position="relative">
      <MapContainer
        center={UK_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl={true}
        preferCanvas
      >
        <MapController
          targetView={targetView || null}
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
          onStationSelect={onStationSelect}
        />

        {selectedTrain && <RouteRenderer key={selectedTrain.trainId} selectedTrain={selectedTrain} />}

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