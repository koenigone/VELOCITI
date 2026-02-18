import { useState } from 'react';
import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';
import type { MapTarget } from './types';

function App() 
{
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<any | null>(null);
  const [routeStops, setRouteStops] = useState<any[]>([]); 

  const handleLocationSelect = (lat: number, lng: number) => 
    {
    setMapTarget({ lat, lng, zoom: 14 });
    setSelectedTrain(null);
    setRouteStops([]);
    };

  const handleTrainSelect = (train: any) => 
  {
    console.log("TRAIN SELECTED:", train);
    setSelectedTrain(train);
  };

  return (
    <Layout
      sideContent=
      {
        <Sidebar
          onLocationSelect={handleLocationSelect}
          onTrainSelect={handleTrainSelect}
          selectedTrain={selectedTrain}
          routeStops={routeStops}   
        />
      }
      mapContent=
      {
        <MapArea
          targetView={mapTarget}
          selectedTrain={selectedTrain}
          setRouteStops={setRouteStops} 
        />
      }
    />
  );
}

export default App;




