import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { Box, Spinner } from '@chakra-ui/react';

import { MapContainer, TileLayer, useMap, Polyline, CircleMarker, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';

import { ALL_TIPLOCS, findTiploc } from '../../data/tiplocData';
import { trainApi } from '../../api/api';
import type { TiplocData, Train, ScheduleStop, MovementEvent } from '../../types';
import MapControls from './mapControls';
import { MAP_LAYERS } from './mapLayers';

// configs
const UK_CENTER: [number, number] = [54.5, -2.5];
const DEFAULT_ZOOM = 6;

// route colour palette
const ROUTE_COLORS = {
  completed: '#48BB78',        // green — portion already traveled
  completedOutline: '#276749', // dark green outline
  remaining: '#ED64A6',        // pink — portion still to go
  remainingOutline: '#97266D', // dark pink outline
  lineWeight: 7,               // main line thickness
  outlineWeight: 10,           // border/outline thickness
};

// marker colours
const MARKER_COLORS = {
  origin: '#38A169',        // green pin
  intermediate: '#DD6B20',  // orange pin
  destination: '#E53E3E',   // red pin
  pass: '#ba63ed',          // light blue dot for pass-through points
  passBorder: '#3182CE',    // blue border for pass dots
  trainPosition: '#3182CE', // blue for current train position
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


// creates a numbered pin icon for station markers (origin, intermediate, destination)
const createStationPinIcon = (number: number, color: string): L.DivIcon => {
  return L.divIcon({
    className: 'velociti-station-pin',
    html: `
      <div style="
        position: relative;
        width: 28px;
        height: 36px;
      ">
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          background: ${color};
          transform: rotate(-45deg);
          position: absolute;
          top: 0;
          left: 0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          border: 2px solid rgba(255,255,255,0.9);
        ">
          <span style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            transform: rotate(45deg);
            color: white;
            font-weight: 700;
            font-size: 12px;
            font-family: system-ui, -apple-system, sans-serif;
            text-shadow: 0 1px 1px rgba(0,0,0,0.2);
          ">${number}</span>
        </div>
      </div>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    tooltipAnchor: [0, -36],
  });
};


// creates a special icon for the current train position
const createTrainPositionIcon = (): L.DivIcon => {
  return L.divIcon({
    className: 'velociti-train-position',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 4px;
        background: ${MARKER_COLORS.trainPosition};
        border: 3px solid white;
        box-shadow: 0 0 0 2px ${MARKER_COLORS.trainPosition}, 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    tooltipAnchor: [0, -12],
  });
};


// normalises location strings for matching (uppercase, strip non-alphanumeric)
const normaliseLocation = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '');


// determines the split index: how far along the route the train has traveled
// uses movement data (actual times) to find the last visited stop in the schedule
const findSplitIndex = (
  scheduleStops: ScheduleStop[],
  movements: MovementEvent[],
  train: Train
): number => {

  // build a set of visited location names from movement events that have actual times
  const visitedLocations = new Set<string>();
  for (const m of movements) {
    if (m.actual || m.actualDeparture) {
      visitedLocations.add(normaliseLocation(m.location));
    }
  }

  // walk backwards through the schedule to find the last visited stop
  if (visitedLocations.size > 0) {
    for (let i = scheduleStops.length - 1; i >= 0; i--) {
      const stopKey = normaliseLocation(scheduleStops[i].location);
      const tiplocKey = normaliseLocation(scheduleStops[i].tiploc);
      if (visitedLocations.has(stopKey) || visitedLocations.has(tiplocKey)) {
        return i;
      }
    }
  }

  // fallback: use lastReportedLocation from the train object
  if (train.lastReportedLocation) {
    const reported = normaliseLocation(train.lastReportedLocation);
    for (let i = scheduleStops.length - 1; i >= 0; i--) {
      const stopKey = normaliseLocation(scheduleStops[i].location);
      const tiplocKey = normaliseLocation(scheduleStops[i].tiploc);
      if (stopKey === reported || tiplocKey === reported) {
        return i;
      }
    }
  }

  // no movement data at all — return -1 (nothing completed)
  return -1;
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

  const reportedLocation = selectedTrain.lastReportedLocation?.trim().toUpperCase();
  if (!reportedLocation) return null;

  const scheduleMatch = scheduleStops.find(stop => {
    const stopName = stop.location?.trim().toUpperCase();
    const stopTiploc = stop.tiploc?.trim().toUpperCase();
    return stopName === reportedLocation || stopTiploc === reportedLocation;
  });

  if (scheduleMatch?.latLong?.latitude && scheduleMatch?.latLong?.longitude) {
    return [scheduleMatch.latLong.latitude, scheduleMatch.latLong.longitude];
  }

  const localMatch = findTiploc(reportedLocation);
  if (localMatch?.Latitude && localMatch?.Longitude) {
    return [localMatch.Latitude, localMatch.Longitude];
  }

  return null;
};


// formats a 4-digit HHmm time string for tooltip display
const formatStopTime = (timeStr?: string): string => {
  if (!timeStr) return '';
  if (timeStr.length < 3) return timeStr;
  const padded = timeStr.padStart(4, '0');
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
};


// draws the full route for a selected train with dual-color progress, numbered pins, and pass dots
const RouteRenderer = ({ selectedTrain }: { selectedTrain: Train }) => {
  const map = useMap();
  const [scheduleStops, setScheduleStops] = useState<ScheduleStop[]>([]);
  const [movements, setMovements] = useState<MovementEvent[]>([]);

  // fetch both schedule and movement data when the selected train changes
  useEffect(() => {
    let cancelled = false;

    const fetchRoute = async () => {
      try {
        // fetch schedule and movement in parallel
        const [stops, mvts] = await Promise.all([
          trainApi.getTrainSchedule(selectedTrain.activationId, selectedTrain.scheduleId),
          trainApi.getTrainMovement(selectedTrain.activationId, selectedTrain.scheduleId).catch(() => [] as MovementEvent[]),
        ]);

        if (cancelled) return;

        // filter out stops with invalid coordinates
        const validStops = stops.filter(
          s => s.latLong?.latitude && s.latLong?.longitude
        );

        setScheduleStops(validStops);
        setMovements(mvts);

        // fit map bounds to the route
        if (validStops.length >= 2) {
          const bounds = L.latLngBounds(
            validStops.map(s => [s.latLong.latitude, s.latLong.longitude] as [number, number])
          );
          map.fitBounds(bounds, { padding: [50, 50] });
        }

      } catch (err) {
        console.warn('[Velociti] Failed to fetch train route data:', err);

        // fallback straight line between origin and destination using local TIPLOC data
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
          setMovements([]);

          const bounds = L.latLngBounds([
            [origin.Latitude, origin.Longitude],
            [destination.Latitude, destination.Longitude]
          ]);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [selectedTrain.activationId, selectedTrain.scheduleId, selectedTrain.originTiploc, selectedTrain.destinationTiploc, map]);


  if (scheduleStops.length < 2) return null;

  // build full positions array
  const allPositions: [number, number][] = scheduleStops.map(
    s => [s.latLong.latitude, s.latLong.longitude]
  );

  // determine the split point between completed and remaining route
  const splitIndex = findSplitIndex(scheduleStops, movements, selectedTrain);

  // split route into completed (green) and remaining (pink) segments
  // +1 on splitIndex so the two segments share the split point and connect seamlessly
  const completedPositions = splitIndex >= 0
    ? allPositions.slice(0, splitIndex + 1)
    : [];
  const remainingPositions = splitIndex >= 0
    ? allPositions.slice(splitIndex)
    : allPositions;

  // identify station stops (not passes) for numbered markers
  const stationStops = scheduleStops
    .map((stop, index) => ({ stop, index }))
    .filter(({ stop }) => !stop.pass);

  // resolve current train marker position
  const markerPosition = getTrainMarkerPosition(selectedTrain, scheduleStops);
  const trainPositionIcon = createTrainPositionIcon();

  return (
    <>
      {/* ROUTE OUTLINE (dark border behind both segments for depth) */}
      <Polyline
        positions={allPositions}
        pathOptions={{
          color: '#1A202C',
          weight: ROUTE_COLORS.outlineWeight,
          opacity: 0.25,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* COMPLETED SEGMENT (green - already traveled) */}
      {completedPositions.length >= 2 && (
        <>
          <Polyline
            positions={completedPositions}
            pathOptions={{
              color: ROUTE_COLORS.completedOutline,
              weight: ROUTE_COLORS.outlineWeight,
              opacity: 0.5,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <Polyline
            positions={completedPositions}
            pathOptions={{
              color: ROUTE_COLORS.completed,
              weight: ROUTE_COLORS.lineWeight,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </>
      )}

      {/* REMAINING SEGMENT (pink -still to go) */}
      {remainingPositions.length >= 2 && (
        <>
          <Polyline
            positions={remainingPositions}
            pathOptions={{
              color: ROUTE_COLORS.remainingOutline,
              weight: ROUTE_COLORS.outlineWeight,
              opacity: 0.4,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <Polyline
            positions={remainingPositions}
            pathOptions={{
              color: ROUTE_COLORS.remaining,
              weight: ROUTE_COLORS.lineWeight,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </>
      )}

      {/* PASS THROUGH DOTS (small circles at timing points that aren't real stops) */}
      {scheduleStops.map((stop, index) => {
        if (!stop.pass) return null; // only render pass-through points here

        return (
          <CircleMarker
            key={`pass-${stop.tiploc}-${index}`}
            center={[stop.latLong.latitude, stop.latLong.longitude]}
            radius={3}
            pathOptions={{
              color: MARKER_COLORS.passBorder,
              fillColor: MARKER_COLORS.pass,
              fillOpacity: 0.9,
              weight: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <div style={{ fontFamily: 'system-ui', fontSize: '12px' }}>
                <strong>{stop.location}</strong><br />
                <small style={{ color: '#718096' }}>{stop.tiploc}</small><br />
                <small>Pass: {formatStopTime(stop.pass)}</small>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* NUMBERED STATION PIN MARKERS (origin, intermediate stops, destination) */}
      {stationStops.map(({ stop, index }, stationNumber) => {
        const isFirst = index === 0;
        const isLast = index === scheduleStops.length - 1;
        const pinColor = isFirst
          ? MARKER_COLORS.origin
          : isLast
            ? MARKER_COLORS.destination
            : MARKER_COLORS.intermediate;

        const icon = createStationPinIcon(stationNumber + 1, pinColor);
        const timeStr = stop.departure
          ? `Depart: ${formatStopTime(stop.departure)}`
          : `Arrive: ${formatStopTime(stop.arrival)}`;

        return (
          <Marker
            key={`station-${stop.tiploc}-${index}`}
            position={[stop.latLong.latitude, stop.latLong.longitude]}
            icon={icon}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <div style={{ fontFamily: 'system-ui', fontSize: '12px' }}>
                <strong>{stop.location}</strong><br />
                <small style={{ color: '#718096' }}>{stop.tiploc}</small><br />
                <small>{timeStr}</small>
              </div>
            </Tooltip>
          </Marker>
        );
      })}

      {/* CURRENT TRAIN POSITION MARKER */}
      {markerPosition && (
        <Marker position={markerPosition} icon={trainPositionIcon} zIndexOffset={1000}>
          <Tooltip direction="top" offset={[0, -14]} sticky>
            <div style={{ fontFamily: 'system-ui', fontSize: '12px', lineHeight: '1.4' }}>
              <strong style={{ fontSize: '13px' }}>{selectedTrain.headCode}</strong>
              {selectedTrain.toc_Name && (
                <span style={{ color: '#718096', marginLeft: '6px', fontSize: '11px' }}>{selectedTrain.toc_Name}</span>
              )}
              <br />
              <span>{selectedTrain.lastReportedLocation || 'Live position'}</span><br />
              <span style={{
                color: selectedTrain.lastReportedDelay > 0 ? '#E53E3E' : '#38A169',
                fontWeight: 600
              }}>
                {selectedTrain.lastReportedDelay > 0
                  ? `${selectedTrain.lastReportedDelay} min${selectedTrain.lastReportedDelay !== 1 ? 's' : ''} late`
                  : 'On time'}
              </span>
              {selectedTrain.lastReportedType && (
                <span style={{ color: '#A0AEC0', marginLeft: '4px', fontSize: '11px' }}>
                  · {selectedTrain.lastReportedType}
                </span>
              )}
            </div>
          </Tooltip>
        </Marker>
      )}
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
// uses a ref for onStationSelect to prevent the entire layer being torn down
// and rebuilt on every parent re-render (which was causing the memory leak / grey screen)
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
      const baseStyle = isSearchedTarget ? SEARCHED_STATION_STYLE : DEFAULT_STATION_STYLE;

      return L.circleMarker([t.Latitude, t.Longitude], { ...baseStyle, renderer: canvasRenderer })
        .bindTooltip(`
        <div style="font-family: system-ui;">
          <strong>${t.Name}</strong><br/>
          <small>TIPLOC: ${t.Tiploc}</small>
        </div>
      `)
        .on('click', () => {
          onStationSelectRef.current?.(t);
        });
    }).filter((m): m is L.CircleMarker => m !== null);

    // create a layer group for the markers and add to map
    layerRef.current = L.featureGroup(markers);
    map.addLayer(layerRef.current);

    return () => { // cleanup function to remove layer when unmounting or before next render
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, visible, searchedStation]); // onStationSelect deliberately excluded — accessed via ref

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
