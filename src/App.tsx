import { useState } from 'react';
import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';
import TrainDetailPanel from './components/panels/trainDetailPanel';
import type { MapTarget } from './components/map/mapArea';

function App() 
{
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<any | null>(null);
  const [, setRouteStops] = useState<any[]>([]); 
  const [searchedStation, setSearchedStation] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const handleLocationSelect = (lat: number, lng: number, stationCode: string) => 
    {
    setMapTarget({ lat, lng, zoom: 14 });
    setSelectedTrain(null);
    setRouteStops([]);
    setSearchedStation(stationCode); 
    setShowDetailPanel(false);
    };

  const handleTrainSelect = (train: any) => 
  {
    setSelectedTrain(train);
    setShowDetailPanel(true);
  };

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
          setRouteStops={setRouteStops} 
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