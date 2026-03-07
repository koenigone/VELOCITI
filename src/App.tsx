import { useState } from 'react';
import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';
import TrainDetailPanel from './components/layout/trainDetailPanel';
import type { MapTarget } from './components/map/mapArea';
import type { Train } from './types';

function App() {
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [searchedStation, setSearchedStation] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  // called when user selects a station from the sidebar search
  const handleLocationSelect = (lat: number, lng: number, stationCode: string) => {
    setMapTarget({ lat, lng, zoom: 14 });
    setSelectedTrain(null);
    setSearchedStation(stationCode);
    setShowDetailPanel(false);
  };

  // called when user clicks a train card in the sidebar
  const handleTrainSelect = (train: Train) => {
    setSelectedTrain(train);
    setShowDetailPanel(true);
  };

  // called when user closes the detail panel
  const handleClosePanel = () => {
    setShowDetailPanel(false);
    setSelectedTrain(null);
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
        />
      }
      panelContent=
      {
        showDetailPanel && selectedTrain ? (
          <TrainDetailPanel
            train={selectedTrain}
            onClose={handleClosePanel}
          />
        ) : undefined
      }
    />
  );
}

export default App;