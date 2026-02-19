import { useState } from 'react';
import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';
import type { MapTarget } from './components/map/mapArea';

function App() 
{
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<any | null>(null);
  const [, setRouteStops] = useState<any[]>([]); 
  const [searchedStation, setSearchedStation] = useState<string | null>(null);

  const handleLocationSelect = (lat: number, lng: number, stationCode: string) => 
    {
    setMapTarget({ lat, lng, zoom: 14 });
    setSelectedTrain(null);
    setRouteStops([]);
    setSearchedStation(stationCode); 
    };

  const handleTrainSelect = (train: any) => 
  {
    setSelectedTrain(train);
  };

  return (
    <Layout
      sideContent=
      {
        <Sidebar
          onLocationSelect={handleLocationSelect}
          onTrainSelect={handleTrainSelect}
        />
      }
      mapContent=
      {
        <MapArea
          targetView={mapTarget}
          selectedTrain={selectedTrain}
          searchedStation={searchedStation} 
          setRouteStops={setRouteStops} 
        />
      }
    />
  );
}

export default App;