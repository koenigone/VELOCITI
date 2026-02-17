import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { Box, Button, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { FaLayerGroup } from "react-icons/fa";
import { MdOutlineZoomInMap } from "react-icons/md";
import L from 'leaflet';
import tiplocDataRaw from '../../data/TiplocPublicExport_2025-12-01_094655.json';
import type { TiplocData, MapTarget } from '../../types';

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

// controller component to handle map interactions based on props changes (targetView, selectedTrain)
const MapController = ({ targetView, selectedTrain }: { targetView: MapTarget | null, selectedTrain: any | null }) => {
    const map = useMap();

    // handle explicit station target (from Search)
    useEffect(() => {
        if (targetView) {
            map.flyTo([targetView.lat, targetView.lng], targetView.zoom || 14);
        }
    }, [targetView, map]);

    // handle Train selection (Resolve location -> FlyTo)
    useEffect(() => {
        if (!selectedTrain) return;

        // logic:
        //  -Try to find the coordinate of the "last reported location"
        //  -fallback to "origin tiploc"

        let foundLocation: TiplocData | undefined;

        if (selectedTrain.lastReportedLocation) {
            foundLocation = tiplocs.find(t => t.Name === selectedTrain.lastReportedLocation);
        }

        if (!foundLocation && selectedTrain.originTiploc) {
            foundLocation = tiplocs.find(t => t.Tiploc === selectedTrain.originTiploc);
        }

        if (foundLocation && foundLocation.Latitude && foundLocation.Longitude) {
            map.flyTo([foundLocation.Latitude, foundLocation.Longitude], 15);

        } else {
            console.warn("Could not resolve location for train:", selectedTrain);
        }

    }, [selectedTrain, map]);

    return null;
};

// canvas layer - drawing tiplocs as icons on canvas for better performance with many points
const TiplocCanvasLayer = () => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;
        const myRenderer = L.canvas({ padding: 0.5 });

        const markers = tiplocs.map((t) => {
            if (!t.Latitude || !t.Longitude) return null;

            const marker = L.circleMarker([t.Latitude, t.Longitude], {
                renderer: myRenderer,
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
        return () => { layerGroup.remove(); };
    }, [map]);

    return null;
};

// map controls section
const MapControls = ({ currentLayer, onLayerChange, onReset }: any) => {
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
        <Box position="absolute" top="4" right="4" zIndex={1000} display="flex" flexDirection="column" gap={3}>
            <Button {...glassButtonStyle} onClick={onReset} leftIcon={<MdOutlineZoomInMap fontSize="1.1rem" color="#3182ce" />}>
                Reset Map
            </Button>
            <Menu matchWidth>
                <MenuButton as={Button} {...glassButtonStyle} leftIcon={<FaLayerGroup fontSize="1rem" color="#3182ce" />} textAlign="left">
                    <Box as="span" isTruncated>{currentLayer.name}</Box>
                </MenuButton>
                <MenuList zIndex={1001} fontSize="sm" shadow="xl" bg="whiteAlpha.900" backdropFilter="blur(8px)">
                    {Object.values(MAP_LAYERS).map((layer) => (
                        <MenuItem key={layer.name} onClick={() => onLayerChange(layer)} fontWeight={currentLayer.name === layer.name ? "600" : "normal"}>
                            {layer.name}
                        </MenuItem>
                    ))}
                </MenuList>
            </Menu>
        </Box>
    );
};

interface MapAreaProps {
    targetView?: MapTarget | null;
    selectedTrain?: any | null;
}

// main map component
const MapArea = ({ targetView, selectedTrain }: MapAreaProps) => {
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
                <MapController targetView={targetView || null} selectedTrain={selectedTrain || null} />

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