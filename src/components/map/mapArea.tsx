import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { Box, Spinner } from '@chakra-ui/react';

import { MapContainer, TileLayer, useMap, Polyline, CircleMarker, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';

import { ALL_TIPLOCS, findTiploc } from '../../data/tiplocData';
import { trainApi } from '../../api/api';
import type { TiplocData, Train, ScheduleStop } from '../../types';
import MapControls from './mapControls';
import { MAP_LAYERS } from './mapLayers';

// configs
const UK_CENTER: [number, number] = [54.5, -2.5];
const DEFAULT_ZOOM = 6;
const LIVE_TRAIN_ICON = L.divIcon({
  className: 'velociti-live-train-icon',
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#e53e3e;border:3px solid white;box-shadow:0 0 0 2px #c53030;"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// normalises location strings so live updates can match route stops more reliably
const normaliseLocation = (value = '') => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const normaliseEventType = (value = '') => value.trim().toUpperCase().replace(/[^A-Z]/g, '');

const getStopCoords = (stop?: ScheduleStop | null): [number, number] | null => {
  if (stop?.latLong?.latitude && stop?.latLong?.longitude) {
    return [stop.latLong.latitude, stop.latLong.longitude];
  }

  return null;
};


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
      map.flyTo([targetView.lat, targetView.lng], targetView.zoom || 14);
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


// tries to resolve the train marker position from live coords, route stops, or local TIPLOC data
const getTrainMarkerPosition = (
  selectedTrain: Train,
  scheduleStops: ScheduleStop[]
): [number, number] | null => {
  if (
    typeof selectedTrain.lastReportedLatitude === 'number' &&
    typeof selectedTrain.lastReportedLongitude === 'number'
  ) {
    return [selectedTrain.lastReportedLatitude, selectedTrain.lastReportedLongitude];
  }

  const reportedLocation = normaliseLocation(selectedTrain.lastReportedLocation);
  const reportedType = normaliseEventType(selectedTrain.lastReportedType);

  if (reportedLocation) {
    const scheduleMatch = scheduleStops.find(stop => {
      const stopName = normaliseLocation(stop.location);
      const stopTiploc = normaliseLocation(stop.tiploc);
      return stopName === reportedLocation || stopTiploc === reportedLocation;
    });

    if (scheduleMatch?.latLong?.latitude && scheduleMatch?.latLong?.longitude) {
      return [scheduleMatch.latLong.latitude, scheduleMatch.latLong.longitude];
    }

    const localMatch = findTiploc(reportedLocation);
    if (localMatch?.Latitude && localMatch?.Longitude) {
      return [localMatch.Latitude, localMatch.Longitude];
    }
  }

  if (reportedType === 'ACTIVATED' || reportedType === 'ORIGIN' || reportedType === 'DEPARTURE') {
    const firstStopCoords = getStopCoords(scheduleStops[0]);
    if (firstStopCoords) return firstStopCoords;

    const origin = findTiploc(selectedTrain.originTiploc);
    if (origin?.Latitude && origin?.Longitude) {
      return [origin.Latitude, origin.Longitude];
    }
  }

  if (reportedType === 'DESTINATION' || reportedType === 'ARRIVAL') {
    const lastStopCoords = getStopCoords(scheduleStops[scheduleStops.length - 1]);
    if (lastStopCoords) return lastStopCoords;

    const destination = findTiploc(selectedTrain.destinationTiploc);
    if (destination?.Latitude && destination?.Longitude) {
      return [destination.Latitude, destination.Longitude];
    }
  }

  const originStopCoords = getStopCoords(scheduleStops[0]);
  if (originStopCoords) {
    return originStopCoords;
  }

  const origin = findTiploc(selectedTrain.originTiploc);
  if (origin?.Latitude && origin?.Longitude) {
    return [origin.Latitude, origin.Longitude];
  }

  const destinationStopCoords = getStopCoords(scheduleStops[scheduleStops.length - 1]);
  if (destinationStopCoords) {
    return destinationStopCoords;
  }

  const destination = findTiploc(selectedTrain.destinationTiploc);
  if (destination?.Latitude && destination?.Longitude) {
    return [destination.Latitude, destination.Longitude];
  }

  return null;
};

const getDelayLabel = (delay?: number) => {
  if (typeof delay !== 'number' || Number.isNaN(delay)) {
    return 'Delay unavailable';
  }

  if (delay === 0) {
    return 'On time';
  }

  if (delay > 0) {
    return `${delay} min late`;
  }

  return `${Math.abs(delay)} min early`;
};


// draws the actual scheduled route for a selected train using the schedule API
const RouteRenderer = ({ selectedTrain }: { selectedTrain: Train }) => {
  const map = useMap();
  const [scheduleStops, setScheduleStops] = useState<ScheduleStop[]>([]);

  // when selectedTrain changes, fetch its full scheduled route from the API
  useEffect(() => {
    let cancelled = false;

    const fetchRoute = async () => {
      try {
        // fetch the real scheduled route with lat/lng for each timing point
        const stops = await trainApi.getTrainSchedule(
          selectedTrain.activationId,
          selectedTrain.scheduleId
        );

        if (cancelled) return;

        // filter out stops with invalid coordinates
        const validStops = stops.filter(
          s => s.latLong?.latitude && s.latLong?.longitude
        );

        setScheduleStops(validStops);

        // fit map bounds to the route if we have points
        if (validStops.length >= 2) {
          const bounds = L.latLngBounds(
            validStops.map(s => [s.latLong.latitude, s.latLong.longitude] as [number, number])
          );
          map.fitBounds(bounds, { padding: [50, 50] });
        } else if (validStops.length === 1) {
          map.flyTo([validStops[0].latLong.latitude, validStops[0].latLong.longitude], 14);
        }

      } catch (err) {
        console.warn('[Velociti] Failed to fetch train schedule route:', err);

        // fallback: draw a straight line between origin and destination using local TIPLOC data
        const origin = findTiploc(selectedTrain.originTiploc);
        const destination = findTiploc(selectedTrain.destinationTiploc);

        if (!cancelled && origin?.Latitude && destination?.Latitude) {
          setScheduleStops([
            {
              tiploc: origin.Tiploc,
              location: origin.Name,
              latLong: { latitude: origin.Latitude, longitude: origin.Longitude },
              departure: ''
            },
            {
              tiploc: destination.Tiploc,
              location: destination.Name,
              latLong: { latitude: destination.Latitude, longitude: destination.Longitude },
              arrival: ''
            }
          ]);

          const bounds = L.latLngBounds([
            [origin.Latitude, origin.Longitude],
            [destination.Latitude, destination.Longitude]
          ]);
          map.fitBounds(bounds, { padding: [50, 50] });
        } else if (!cancelled && origin?.Latitude && origin?.Longitude) {
          setScheduleStops([
            {
              tiploc: origin.Tiploc,
              location: origin.Name,
              latLong: { latitude: origin.Latitude, longitude: origin.Longitude },
              departure: ''
            }
          ]);

          map.flyTo([origin.Latitude, origin.Longitude], 14);
        }
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [selectedTrain.activationId, selectedTrain.scheduleId, selectedTrain.originTiploc, selectedTrain.destinationTiploc, map]);

  // build positions array for the polyline
  const positions: [number, number][] = scheduleStops.map(
    s => [s.latLong.latitude, s.latLong.longitude]
  );

  const markerPosition = getTrainMarkerPosition(selectedTrain, scheduleStops);

  return (
    <>
      {/* route line connecting all stops */}
      {positions.length >= 2 && (
        <Polyline
          positions={positions}
          pathOptions={{
            color: "#e53e3e",
            weight: 4,
            opacity: 0.85
          }}
        />
      )}

      {/* selected train live marker */}
      {markerPosition && (
        <Marker position={markerPosition} icon={LIVE_TRAIN_ICON} zIndexOffset={1000}>
          <Tooltip direction="top" offset={[0, -8]}>
            <div style={{ fontFamily: 'system-ui', fontSize: '12px' }}>
              <strong>{selectedTrain.headCode}</strong><br />
              <small>{selectedTrain.lastReportedLocation || selectedTrain.originLocation || 'Live position'}</small><br />
              <small>{selectedTrain.lastReportedType || 'UPDATE'} · {getDelayLabel(selectedTrain.lastReportedDelay)}</small>
            </div>
          </Tooltip>
        </Marker>
      )}

      {/* stop markers along the route */}
      {positions.length >= 2 && scheduleStops.map((stop, index) => {
        const isFirst = index === 0;
        const isLast = index === scheduleStops.length - 1;
        const isPass = !!stop.pass;

        return (
          <CircleMarker
            key={`${stop.tiploc}-${index}`}
            center={[stop.latLong.latitude, stop.latLong.longitude]}
            radius={isFirst || isLast ? 6 : isPass ? 3 : 5}
            pathOptions={{
              color: isFirst ? "#38a169" : isLast ? "#e53e3e" : isPass ? "#90cdf4" : "#f6ad55",
              fillColor: isFirst ? "#48bb78" : isLast ? "#fc8181" : isPass ? "#bee3f8" : "#fbd38d",
              fillOpacity: 1,
              weight: isFirst || isLast ? 2 : 1
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <div style={{ fontFamily: "system-ui", fontSize: "12px" }}>
                <strong>{stop.location}</strong><br />
                <small style={{ color: "#718096" }}>{stop.tiploc}</small>
                {stop.departure && <><br /><small>Depart: {stop.departure}</small></>}
                {stop.arrival && <><br /><small>Arrive: {stop.arrival}</small></>}
                {stop.pass && <><br /><small>Pass: {stop.pass}</small></>}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
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
        .bindTooltip(`
        <div style="font-family: system-ui;">
          <strong>${t.Name}</strong><br/>
          <small>TIPLOC: ${t.Tiploc}</small>
        </div>
      `)
        .on('click', () => {
          onStationSelect?.(t);
        });
    }).filter((m): m is L.CircleMarker => m !== null);

    // create a layer group for the markers and add to map
    layerRef.current = L.featureGroup(markers);
    map.addLayer(layerRef.current);

    return () => { // cleanup function to remove layer when unmounting or before next render
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [map, visible, searchedStation, onStationSelect]);

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