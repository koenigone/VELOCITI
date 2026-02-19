import { Box, Button, Menu, MenuButton, MenuList, MenuItem, Text } from '@chakra-ui/react';
import { FaLayerGroup, FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdOutlineZoomInMap } from 'react-icons/md';


// types
export interface LayerConfig {
  name: string;
  url: string;
  attribution: string;
}


// available map layers
export const MAP_LAYERS: Record<string, LayerConfig> = {
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


// props for controls components
interface MapControlsProps {
  currentLayer: LayerConfig;
  onLayerChange: (layer: LayerConfig) => void;
  onReset: () => void;
  showTiplocs: boolean;
  onToggleTiplocs: () => void;
}


// main component
const MapControls = ({ currentLayer, onLayerChange, onReset, showTiplocs, onToggleTiplocs }: MapControlsProps) => {

  const glassStyle = { // custom controls styling
    bg: "whiteAlpha.900",
    backdropFilter: "blur(4px)",
    shadow: "lg",
    border: "1px solid",
    borderColor: "gray.200",
    _hover: { bg: "white" },
    size: "sm",
    width: "160px",
    justifyContent: "flex-start"
  };

  return (
    <Box position="absolute" top={4} right={4} zIndex={1000} display="flex" flexDirection="column" gap={2}>
      {/* map reset btn */}
      <Button {...glassStyle} leftIcon={<MdOutlineZoomInMap />} onClick={onReset}>
        Reset View
      </Button>

      {/* toggle tiploc btn */}
      <Button
        {...glassStyle}
        leftIcon={showTiplocs ? <FaEyeSlash /> : <FaEye />}
        onClick={onToggleTiplocs}
        colorScheme={"gray"}
        variant={showTiplocs ? "solid" : "outline"}
      >
        {showTiplocs ? "Hide Stations" : "Show Stations"}
      </Button>

      {/* layers menu */}
      <Menu matchWidth>
        <MenuButton as={Button} {...glassStyle} leftIcon={<FaLayerGroup />}>
          <Text isTruncated>{currentLayer.name}</Text>
        </MenuButton>
        <MenuList zIndex={1002} shadow="xl">
          {Object.values(MAP_LAYERS).map((layer) => (
            <MenuItem
              key={layer.name}
              onClick={() => onLayerChange(layer)}
              bg={currentLayer.name === layer.name ? "blue.50" : "transparent"}
              color={currentLayer.name === layer.name ? "blue.600" : "inherit"}
              fontWeight={currentLayer.name === layer.name ? "600" : "normal"}
            >
              {layer.name}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    </Box>
  );
};

export default MapControls;