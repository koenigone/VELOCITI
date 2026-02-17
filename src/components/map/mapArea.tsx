import type { Stop } from '../../App';
import 'leaflet/dist/leaflet.css';
import { Box, Button, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useState } from 'react';

import { FaLayerGroup } from 'react-icons/fa';
import { MdOutlineZoomInMap } from 'react-icons/md';

// available map layers
const MAP_LAYERS = {
  standard: {
    name: 'Standard',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  openStreet: {
    name: 'Open Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  worldStreetMap: {
    name: 'World Street Map',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  dark: {
    name: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

// 1) Props: parent can pass a function to receive stops for a journey
type MapAreaProps = {
  onJourneyClick?: (stops: Stop[]) => void;
};

// 2) Temporary fake journey data for testing
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

// default map and zoom center (center of UK)
const UK_CENTER: [number, number] = [54.5, -2.5];
const DEFAULT_ZOOM = 7;

const MapControls = ({ onReset, currentLayer, onLayerChange }: any) => {
  return (
    <Box
      position="absolute"
      top="4"
      right="4"
      zIndex={1000}
      display="flex"
      flexDirection="column"
      gap={2}
    >
      {/* RESET BUTTON */}
      <Button
        size="sm"
        bg="white"
        color="gray.700"
        border="1px"
        borderColor="gray.200"
        shadow="md"
        _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
        onClick={onReset}
        leftIcon={<MdOutlineZoomInMap color="#3182ce" />}
        justifyContent="flex-start"
        minW="150px"
      >
        Reset Map
      </Button>

      {/* LAYER MENU */}
      <Menu>
        <MenuButton
          as={Button}
          size="sm"
          bg="white"
          color="gray.700"
          border="1px"
          borderColor="gray.200"
          shadow="md"
          _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
          leftIcon={<FaLayerGroup color="#3182ce" />}
          justifyContent="flex-start"
          minW="150px"
          textAlign="left"
        >
          {currentLayer.name}
        </MenuButton>

        <MenuList zIndex={1001} fontSize="sm" shadow="lg">
          {Object.values(MAP_LAYERS).map((layer) => (
            <MenuItem
              key={layer.name}
              onClick={() => onLayerChange(layer)}
              fontWeight={currentLayer.name === layer.name ? 'bold' : 'normal'}
              color={currentLayer.name === layer.name ? 'blue.600' : 'gray.700'}
            >
              {layer.name}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    </Box>
  );
};

// handle map events and expose a reset function to parent via callback
const MapEvents = ({ onResetRef }: { onResetRef: (fn: () => void) => void }) => {
  const map = useMap();

  if (onResetRef) {
    onResetRef(() => {
      map.setView(UK_CENTER, DEFAULT_ZOOM, { animate: true });
    });
  }
  return null;
};

// 3) MapArea now accepts onJourneyClick from App
const MapArea = ({ onJourneyClick }: MapAreaProps) => {
  const [activeLayer, setActiveLayer] = useState(MAP_LAYERS.standard);
  const [resetMapFn, setResetMapFn] = useState<(() => void) | null>(null);

  return (
    <Box w="full" h="full" position="relative" id="map-container">
      {/* controls overlaid on top of the map */}
      <MapControls
        onReset={() => resetMapFn?.()}
        currentLayer={activeLayer}
        onLayerChange={setActiveLayer}
      />

      <MapContainer
        center={UK_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <MapEvents onResetRef={setResetMapFn} />
        <TileLayer
          key={activeLayer.name}
          attribution={activeLayer.attribution}
          url={activeLayer.url}
        />

        {/* 4) Example marker that triggers onJourneyClick with demo stops */}
        <Marker
          position={[51.505, -0.09]}
          eventHandlers={{
            click: () => {
              if (onJourneyClick) {
                onJourneyClick(demoJourneyStops);
              }
            },
          }}
        >
          <Popup>Velocity London</Popup>
        </Marker>
      </MapContainer>
    </Box>
  );
};

export default MapArea;
