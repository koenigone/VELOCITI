import { useState } from 'react';
import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';
import type { MapTarget } from './types';

function App() {
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<any | null>(null);

  const handleLocationSelect = (lat: number, lng: number) => {
    setMapTarget({ lat, lng, zoom: 14 });
    setSelectedTrain(null);
  };

  const handleTrainSelect = (train: any) => {
    setSelectedTrain(train);
  };

  return (
    <Layout
      sideContent={
        <Sidebar 
          onLocationSelect={handleLocationSelect} 
          onTrainSelect={handleTrainSelect}
        />
      }
      mapContent={
        <MapArea 
          targetView={mapTarget}
          selectedTrain={selectedTrain}
        />
      }
    />
  );
}

export default App;