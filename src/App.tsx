import { useState } from 'react';
import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';

import type { Train } from './types';
import type { MapTarget } from './components/map/mapArea';


function App() {
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [searchedStation, setSearchedStation] = useState<string | null>(null);

  // reset map to default view and clear selected train and searched station
  const handleLocationSelect = (lat: number, lng: number, stationCode: string) => {
    setMapTarget({ lat, lng, zoom: 14 });
    setSelectedTrain(null);
    setSearchedStation(stationCode);
  };

  // handle train selection from sidebar and set it as the selected train to show route on map
  const handleTrainSelect = (train: Train) => {
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
          searchedStation={searchedStation}
        />
      }
    />
  );
}

export default App;