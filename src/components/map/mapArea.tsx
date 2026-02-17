import { useState } from "react";
import 
{
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} 
from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import stationDataRaw from "../../data/TiplocPublicExport_2025-12-01_094655.json";

type Tiploc = 
{
  Name: string;
  Tiploc: string;
  Latitude: number;
  Longitude: number;
  Details: 
  {
    CRS: string | null;
  };
};

type TiplocExport = 
{
  ExportDate: string;
  ExportCount: number;
  Tiplocs: Tiploc[];
};

const stationData: TiplocExport = stationDataRaw as TiplocExport;

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions
({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

export default function MapArea() 
{
  const stations: Tiploc[] = stationData.Tiplocs.filter
  (
    (station) => station.Details?.CRS !== null
  );

  const [startStation, setStartStation] = useState<Tiploc | null>(null);
  const [endStation, setEndStation] = useState<Tiploc | null>(null);

  const handleStationClick = (station: Tiploc) => 
   {
    if (!startStation) 
    {
      setStartStation(station);
    } 
    else if (!endStation) 
    {
      setEndStation(station);
    } else 
    {
      setStartStation(station);
      setEndStation(null);
    }
   };

  const routePositions: [number, number][] =
    startStation && endStation
      ? [
          [startStation.Latitude, startStation.Longitude],
          [endStation.Latitude, endStation.Longitude],
        ]
      : [];

  return (
    <MapContainer
      center={[53.4808, -2.2426]}
      zoom={6}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {stations.slice(0, 500).map((station, index) => (
        <Marker
          key={index}
          position={[station.Latitude, station.Longitude]}
          eventHandlers=
          {{
            click: () => handleStationClick(station),
          }}
        >
          <Popup>
            <strong>{station.Name}</strong>
            <br />
            CRS: {station.Details.CRS}
            <br />
            TIPLOC: {station.Tiploc}
          </Popup>
        </Marker>
      ))}

      {routePositions.length === 2 && 
      (
        <Polyline positions={routePositions} />
      )}
    </MapContainer>
  );
}





