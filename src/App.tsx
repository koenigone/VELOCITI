import { useCallback, useState } from 'react';
import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';
import TrainDetailPanel from './components/layout/trainDetailPanel';
import useLiveSelectedTrain from './hooks/useLiveSelectedTrain';
import type { MapTarget } from './components/map/mapArea';
import type { Train, TiplocData } from './types';

function App() {
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [searchedStation, setSearchedStation] = useState<string | null>(null);
  const [trains, setTrains] = useState<Train[]>([]); // train list source, shared between sidebar and details panel
  const [mapClickedStation, setMapClickedStation] = useState<TiplocData | null>(null); // station clicked on the map -> trigger search

  // live socket update
  const handleLiveTrainUpdate = useCallback((updatedTrain: Train) => {
    setSelectedTrain(current => {
      if (!current || current.trainId !== updatedTrain.trainId) {
        return current;
      }
      return updatedTrain;
    });

    setTrains(current =>
      current.map(t => t.trainId === updatedTrain.trainId ? updatedTrain : t)
    );
  }, []);

  const { liveStatus, lastUpdated, setLastUpdated } = useLiveSelectedTrain(selectedTrain, handleLiveTrainUpdate);


  // called when the sidebar executes a station search
  const handleLocationSelect = useCallback((lat: number, lng: number, stationCode: string) => {
    setMapTarget({ lat, lng, zoom: 14 });
    setSelectedTrain(null);
    setSearchedStation(stationCode);
  }, []);

  // called when user clicks a station marker on the map
  const handleStationSelect = useCallback((station: TiplocData) => {
    setSelectedTrain(null);
    setMapClickedStation(station);
  }, []);

  // called when user clicks a train card in the sidebar
  const handleTrainSelect = useCallback((train: Train) => {
    setSelectedTrain(train);
  }, []);

  // called when user closes the train detail panel
  const handleCloseTrainPanel = useCallback(() => {
    setSelectedTrain(null);
  }, []);

  return (
    <Layout
      sideContent=
      {
        <Sidebar
          trains={trains}
          onTrainsChange={setTrains}
          onLocationSelect={handleLocationSelect}
          onTrainSelect={handleTrainSelect}
          externalStation={mapClickedStation}
        />
      }
      mapContent=
      {
        <MapArea
          targetView={mapTarget}
          selectedTrain={selectedTrain}
          searchedStation={searchedStation}
          onStationSelect={handleStationSelect}
        />
      }
      panelContent=
      {
        selectedTrain ? (
          <TrainDetailPanel
            train={selectedTrain}
            liveStatus={liveStatus}
            lastUpdated={lastUpdated}
            onLastUpdatedChange={setLastUpdated}
            onClose={handleCloseTrainPanel}
          />
        ) : undefined
      }
    />
  );
}

export default App;