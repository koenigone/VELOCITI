import { Box, Button, Menu, MenuButton, MenuList, MenuItem, Text } from '@chakra-ui/react';
import { FaLayerGroup, FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdOutlineZoomInMap } from 'react-icons/md';
import { MAP_LAYERS, type LayerConfig } from './mapLayers';


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

  const glassStyle = {
    bg: "rgba(255, 255, 255, 0.37)",
    backdropFilter: "blur(12px) saturate(180%)",
    sx: {
      WebkitBackdropFilter: "blur(12px) saturate(180%)",
    },
    border: "1px solid",
    borderColor: "rgba(255, 255, 255, 0.3)",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
    color: "#1a365d",
    _hover: {
      bg: "rgba(255, 255, 255, 0.28)",
      borderColor: "rgba(255, 255, 255, 0.5)",
      boxShadow: "0 6px 28px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
    },
    _active: {
      bg: "rgba(255, 255, 255, 0.75)",
    },
    size: "sm",
    width: "160px",
    justifyContent: "flex-start",
    transition: "all 0.2s ease",
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
