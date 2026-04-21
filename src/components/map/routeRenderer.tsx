import { useState, useEffect } from 'react';
import { useMap, Polyline, CircleMarker, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';

import { findTiploc } from '../../data/tiplocData';
import { trainApi } from '../../api/api';
import type { Train, ScheduleStop, MovementEvent } from '../../types';
import { ROUTE_COLORS, MARKER_COLORS } from '../../theme';
import { getStationPinIcon } from './markers';


// formats a 4-digit HHmm time string for tooltip display
const formatStopTime = (timeStr?: string): string => {
    if (!timeStr) return '';
    if (timeStr.length < 3) return timeStr;
    const padded = timeStr.padStart(4, '0');
    return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
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

    // no movement data at all, return -1 (nothing completed)
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

            {/* small circles at timing points that aren't real stops */}
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

                const icon = getStationPinIcon(stationNumber + 1, pinColor);
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

export default RouteRenderer;