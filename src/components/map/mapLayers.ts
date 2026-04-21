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