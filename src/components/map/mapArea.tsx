import type { Stop } from '../../App';

import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { Box, Button, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { FaLayerGroup } from "react-icons/fa";
import { MdOutlineZoomInMap } from "react-icons/md";
import L from 'leaflet';
import tiplocDataRaw from '../../data/TiplocPublicExport_2025-12-01_094655.json';
import type { TiplocData } from '../../types';


type MapAreaProps = {
  onJourneyClick?: (stops: Stop[]) => void;
};

const demoJourneyStops: Stop[] = [
  {
    id: '1',
    locationName: 'London',
    expectedTime: '10:00',
    actualOrEstimatedTime: '10:05',
    status: 'LATE',
  },
  {
    id: '2',
    locationName: 'Sheffield',
    expectedTime: '11:30',
    actualOrEstimatedTime: '11:28',
    status: 'ON_TIME',
  },
];

// configs
const UK_CENTER: [number, number] = [54.5, -2.5];
const DEFAULT_ZOOM = 6;
const tiplocs = (tiplocDataRaw as any).Tiplocs as TiplocData[];

// available map layers
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

// canvas layer - drawing tiplocs as icons on canvas for better performance with many points
const TiplocCanvasLayer = () => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // create a custom canvas renderer for better performance with many markers
        const myRenderer = L.canvas({ padding: 0.5 });

        // loop through all 16k tiplocs
        const markers = tiplocs.map((t) => {
            if (!t.Latitude || !t.Longitude) return null;

            // create custom circle markers for tiplocs (could be changed later)
            const marker = L.circleMarker([t.Latitude, t.Longitude], {
                renderer: myRenderer,
                radius: 4,
                color: '#3388ff',
                fillColor: '#3388ff',
                fillOpacity: 0.8,
                weight: 1
            });

            // marker popup content
            marker.bindPopup(`
                <div style="font-family: sans-serif;">
                    <h3 style="margin:0 0 5px;">${t.Name}</h3>
                    <b>TIPLOC:</b> ${t.Tiploc}<br/>
                    ${t.Details.CRS ? `<b>CRS:</b> ${t.Details.CRS}` : ''}
                </div>
            `);

            return marker;
        }).filter((m): m is L.CircleMarker => m !== null); // filter out any nulls from missing lat/lon

        const layerGroup = L.featureGroup(markers).addTo(map);

        // clean up on unmount
        return () => {
            layerGroup.remove(); // remove the entire layer group (and all markers) from the map
        };
    }, [map]);

    return null;
};

// map controls section
const MapControls = ({ currentLayer, onLayerChange }: any) => {
    const map = useMap();

    const handleReset = () => {
        map.setView(UK_CENTER, DEFAULT_ZOOM, { animate: true });
    };

    // custom button styles
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
            {/* RESET BUTTON */}
            <Button
                {...glassButtonStyle}
                onClick={handleReset}
                leftIcon={<MdOutlineZoomInMap fontSize="1.1rem" color="#3182ce" />}
            >
                Reset Map
            </Button>

            {/* LAYER MENU */}
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

// main map component
const MapArea = () => {
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
            </MapContainer>
        </Box>
    );
};

export default MapArea;