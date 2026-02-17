import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { Box, Button, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { MapContainer, TileLayer, useMap, Polyline, CircleMarker } from 'react-leaflet';
import { FaLayerGroup } from "react-icons/fa";
import { MdOutlineZoomInMap } from "react-icons/md";
import L from 'leaflet';
import tiplocDataRaw from '../../data/TiplocPublicExport_2025-12-01_094655.json';
import type { TiplocData } from '../../types';

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

// ---------------- CANVAS LAYER ----------------
const TiplocCanvasLayer = () => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const renderer = L.canvas({ padding: 0.5 });

        const markers = tiplocs.map((t) => {
            if (!t.Latitude || !t.Longitude) return null;

            const marker = L.circleMarker([t.Latitude, t.Longitude], {
                renderer,
                radius: 4,
                color: '#3388ff',
                fillColor: '#3388ff',
                fillOpacity: 0.8,
                weight: 1
            });

            marker.bindPopup(`
                <div style="font-family: sans-serif;">
                    <h3 style="margin:0 0 5px;">${t.Name}</h3>
                    <b>TIPLOC:</b> ${t.Tiploc}<br/>
                    ${t.Details.CRS ? `<b>CRS:</b> ${t.Details.CRS}` : ''}
                </div>
            `);

            return marker;
        }).filter((m): m is L.CircleMarker => m !== null);

        const layerGroup = L.featureGroup(markers).addTo(map);

        return () => {
            layerGroup.remove();
        };
    }, [map]);

    return null;
};

// ---------------- ROUTE LAYER ----------------
    const RouteLayer = ({ selectedTrain }: { selectedTrain: any | null }) => {
    const map = useMap();
    const [schedule, setSchedule] = useState<string[]>([]);

    useEffect(() => {
        const mockSchedule = [
            "ABRDEEN",
            "ABER",
            "ABINGTN"
        ];
        setTimeout(() => {
            setSchedule(mockSchedule);
        }, 500);
    }, []);

    const scheduledStations = schedule
        .map(code => tiplocs.find(t => t.Tiploc === code))
        .filter((t): t is TiplocData => t !== undefined);

    const routePositions: [number, number][] = scheduledStations.map(
        station => [station.Latitude, station.Longitude]
    );

    useEffect(() => {
        if (routePositions.length > 1) {
            const bounds = L.latLngBounds(routePositions);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, routePositions]);

    if (routePositions.length < 2) return null;

    return (
        <>
            {scheduledStations.map((station, index) => (
                <CircleMarker
                    key={index}
                    center={[station.Latitude, station.Longitude]}
                    radius={8}
                    pathOptions={{
                        color: "#f6ad55",
                        fillColor: "#f6ad55",
                        fillOpacity: 1,
                        weight: 2,
                    }}
                />
            ))}

            <Polyline
                positions={routePositions}
                pathOptions={{
                    color: "#e53e3e",
                    weight: 6,
                    opacity: 0.95,
                }}
            />
        </>
    );
};

// ---------------- CONTROLS ----------------
const MapControls = ({ currentLayer, onLayerChange }: any) => {
    const map = useMap();

    const handleReset = () => {
        map.setView(UK_CENTER, DEFAULT_ZOOM, { animate: true });
    };

    const glassButtonStyle = {
        bg: "whiteAlpha.800",
        backdropFilter: "blur(3px)",
        color: "gray.700",
        shadow: "lg",
        border: "1px solid",
        borderColor: "whiteAlpha.400",
        _hover: { bg: "whiteAlpha.900" },
        _active: { bg: "white" },
        size: "sm",
        w: "160px",
        justifyContent: "flex-start",
        iconSpacing: 3,
    };

    return (
        <Box
            position="absolute"
            top="4"
            right="4"
            zIndex={1000}
            display="flex"
            flexDirection="column"
            gap={3}
        >
            <Button
                {...glassButtonStyle}
                onClick={handleReset}
                leftIcon={<MdOutlineZoomInMap fontSize="1.1rem" color="#3182ce" />}
            >
                Reset Map
            </Button>

            <Menu matchWidth>
                <MenuButton
                    as={Button}
                    {...glassButtonStyle}
                    leftIcon={<FaLayerGroup fontSize="1rem" color="#3182ce" />}
                    textAlign="left"
                >
                    <Box as="span" isTruncated>
                        {currentLayer.name}
                    </Box>
                </MenuButton>

                <MenuList
                    zIndex={1001}
                    fontSize="sm"
                    shadow="xl"
                    bg="whiteAlpha.900"
                    backdropFilter="blur(8px)"
                    border="1px solid"
                    borderColor="gray.100"
                    p={1}
                >
                    {Object.values(MAP_LAYERS).map((layer) => (
                        <MenuItem
                            key={layer.name}
                            onClick={() => onLayerChange(layer)}
                            fontWeight={currentLayer.name === layer.name ? "600" : "normal"}
                            color={currentLayer.name === layer.name ? "blue.600" : "gray.600"}
                            borderRadius="md"
                            _hover={{ bg: "blue.50" }}
                        >
                            {layer.name}
                        </MenuItem>
                    ))}
                </MenuList>
            </Menu>
        </Box>
    );
};

// ---------------- MAIN MAP ----------------
type MapAreaProps = {
  selectedTrain: any | null;
};

const MapArea = ({ selectedTrain }: MapAreaProps) => {
    const [activeLayer, setActiveLayer] = useState(MAP_LAYERS.standard);

    return (
        <Box w="full" h="full" position="relative" id="map-container">
            <MapContainer
                center={UK_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
                zoomControl={false}
                preferCanvas={true}
            >
                <MapControls
                    currentLayer={activeLayer}
                    onLayerChange={setActiveLayer}
                />

                <TileLayer
                    key={activeLayer.name}
                    attribution={activeLayer.attribution}
                    url={activeLayer.url}
                />

                <TiplocCanvasLayer />
                <RouteLayer />
            </MapContainer>
        </Box>
    );
};

export default MapArea;
