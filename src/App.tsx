import { useCallback, useState } from 'react';
import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';
import TrainDetailPanel from './components/layout/trainDetailPanel';
import StationDetailPanel from './components/layout/stationDetailPanel';
import useLiveSelectedTrain from './hooks/useLiveSelectedTrain';
import type { MapTarget } from './components/map/mapArea';
import type { Train, TiplocData } from './types';

function App() {
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [selectedStation, setSelectedStation] = useState<TiplocData | null>(null);
  const [searchedStation, setSearchedStation] = useState<string | null>(null);

  const handleLiveTrainUpdate = useCallback((updatedTrain: Train) => {
    setSelectedTrain(current => {
      if (!current || current.trainId !== updatedTrain.trainId) {
        return current;
      }

      return updatedTrain;
    });
  }, []);

    const { liveStatus, lastUpdated, setLastUpdated } =useLiveSelectedTrain(selectedTrain, handleLiveTrainUpdate);



  // called when user selects a station from the sidebar search
  const handleLocationSelect = (lat: number, lng: number, stationCode: string) => {
    setMapTarget({ lat, lng, zoom: 14 });
    setSelectedTrain(null);
    setSelectedStation(null);
    setSearchedStation(stationCode);
  };

  // called when user clicks a station marker on the map
  const handleStationSelect = (station: TiplocData) => {
    setMapTarget({ lat: station.Latitude, lng: station.Longitude, zoom: 14 });
    setSelectedTrain(null);
    setSelectedStation(station);
    setSearchedStation(station.Tiploc);
  };

  // called when user clicks a train card in the sidebar or station panel
  const handleTrainSelect = (train: Train) => {
    setSelectedStation(null);
    setSelectedTrain(train);
  };

  // called when user closes the train detail panel
  const handleCloseTrainPanel = () => {
    setSelectedTrain(null);
  };

  // called when user closes the station detail panel
  const handleCloseStationPanel = () => {
    setSelectedStation(null);
    setSearchedStation(null);
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
        ) : selectedStation ? (

          <StationDetailPanel
            station={selectedStation}
            onClose={handleCloseStationPanel}
            onTrainSelect={handleTrainSelect}
          />
        ) : undefined
      }
    />
  );
}

export default App;
