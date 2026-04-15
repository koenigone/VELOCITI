import L from 'leaflet';
import { MARKER_COLORS } from '../../theme';
import trainMarker from '../../assets/trainMarker.png'

// numbered station pin icon on the train route
const pinIconCache = new Map<string, L.DivIcon>();

export const getStationPinIcon = (number: number, color: string): L.DivIcon => {
  const key = `${number}-${color}`;
  if (!pinIconCache.has(key)) {
    pinIconCache.set(key, L.divIcon({
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
    }));
  }
  return pinIconCache.get(key)!;
};


// train live position marker
export const TRAIN_POSITION_ICON = L.divIcon({
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


// tiploc layer circle marker styles
export const DEFAULT_STATION_STYLE: L.CircleMarkerOptions = {
  radius: 3,
  color: '#3182ce',
  fillColor: '#63b3ed',
  fillOpacity: 0.8,
  weight: 1,
};

export const SEARCHED_STATION_ICON = L.icon({
  iconUrl: trainMarker, // This uses the imported PNG path
  iconSize: [32, 32],   // Adjust size to your preference
  iconAnchor: [16, 16], // Point of the icon which will correspond to marker's location (center)
  popupAnchor: [0, -16],
  className: 'searched-train-marker'
});