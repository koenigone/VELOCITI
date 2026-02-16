import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { Box, Button, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { FaLayerGroup } from "react-icons/fa";
import { MdOutlineZoomInMap } from "react-icons/md";
import L from 'leaflet';
import tiplocDataRaw from '../../data/TiplocPublicExport_2025-12-01_094655.json';
import type { TiplocData } from '../../types';
import trainIcon from '../../assets/trainMarker.png';

// configs
const ICON_SIZE = 25;
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
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        if (!map) return;

        const canvas = L.DomUtil.create('canvas', 'leaflet-zoom-animated');
        const pane = map.getPane('overlayPane');
        if (pane) pane.appendChild(canvas);
        canvasRef.current = canvas;

        const img = new Image();
        img.src = trainIcon;
        img.onload = () => {
            imageRef.current = img;
            drawLayer();
        };

        const drawLayer = () => {
            if (!map || !canvas || !imageRef.current) return;

            const size = map.getSize();
            const bounds = map.getBounds();
            canvas.width = size.x;
            canvas.height = size.y;

            const topLeft = map.containerPointToLayerPoint([0, 0]);
            L.DomUtil.setPosition(canvas, topLeft);

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const paddedBounds = bounds.pad(0.1);

            tiplocs.forEach((t) => {
                if (t.Latitude && t.Longitude) {
                    if (paddedBounds.contains([t.Latitude, t.Longitude])) {
                        const point = map.latLngToContainerPoint([t.Latitude, t.Longitude]);
                        const halfSize = ICON_SIZE / 2;
                        ctx.drawImage(
                            imageRef.current!,
                            Math.floor(point.x - halfSize),
                            Math.floor(point.y - halfSize),
                            ICON_SIZE,
                            ICON_SIZE
                        );
                    }
                }
            });
        };

        const onMapClick = (e: L.LeafletMouseEvent) => {
            const clickLat = e.latlng.lat;
            const clickLng = e.latlng.lng;
            let closest: TiplocData | null = null;
            let minDistance = Infinity;
            const threshold = 0.005 * Math.pow(2, 10 - map.getZoom());

            for (const t of tiplocs) {
                if (!t.Latitude || !t.Longitude) continue;
                const dist = Math.sqrt(
                    Math.pow(t.Latitude - clickLat, 2) +
                    Math.pow(t.Longitude - clickLng, 2)
                );
                if (dist < minDistance) {
                    minDistance = dist;
                    closest = t;
                }
            }

            if (closest && minDistance < threshold) {
                L.popup()
                    .setLatLng([closest.Latitude, closest.Longitude])
                    .setContent(`
                        <div style="font-family: sans-serif; min-width: 150px;">
                            <h3 style="margin:0 0 5px; font-weight:bold; color:#2b6cb0;">${closest.Name}</h3>
                            <div style="font-size: 0.9em;">
                                <b>TIPLOC:</b> ${closest.Tiploc}<br/>
                                ${closest.Details.CRS ? `<b>CRS:</b> ${closest.Details.CRS}` : ''}
                            </div>
                        </div>
                    `)
                    .openOn(map);
            }
        };

        map.on('moveend zoomend', drawLayer);
        map.on('click', onMapClick);
        drawLayer();

        return () => {
            map.off('moveend zoomend', drawLayer);
            map.off('click', onMapClick);
            if (pane && canvas) pane.removeChild(canvas);
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