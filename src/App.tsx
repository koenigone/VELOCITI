import { useCallback, useState } from 'react';
import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';
import TrainDetailPanel from './components/layout/trainDetailPanel';
<<<<<<< HEAD
=======
import StationDetailPanel from './components/layout/stationDetailPanel';
>>>>>>> 120c0d709138d4e3c1f903d61184ccd38bf281d2
import useLiveSelectedTrain from './hooks/useLiveSelectedTrain';
import type { MapTarget } from './components/map/mapArea';
import type { Train, TiplocData } from './types';

function App() {
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
<<<<<<< HEAD
  const [searchedStation, setSearchedStation] = useState<string | null>(null);

  // station clicked on the map — passed to sidebar so it triggers a search
  const [mapClickedStation, setMapClickedStation] = useState<TiplocData | null>(null);

=======
  const [selectedStation, setSelectedStation] = useState<TiplocData | null>(null);
  const [searchedStation, setSearchedStation] = useState<string | null>(null);

>>>>>>> 120c0d709138d4e3c1f903d61184ccd38bf281d2
  const handleLiveTrainUpdate = useCallback((updatedTrain: Train) => {
    setSelectedTrain(current => {
      if (!current || current.trainId !== updatedTrain.trainId) {
        return current;
      }

      return updatedTrain;
    });
  }, []);

  const { liveStatus } = useLiveSelectedTrain(selectedTrain, handleLiveTrainUpdate);

<<<<<<< HEAD
  // called when the sidebar executes a station search (both manual and map-triggered)
  const handleLocationSelect = useCallback((lat: number, lng: number, stationCode: string) => {
    setMapTarget({ lat, lng, zoom: 14 });
    setSelectedTrain(null);
    setSearchedStation(stationCode);
  }, []);

  // called when user clicks a station marker on the map
  // instead of opening a separate panel, we tell the sidebar to search for it
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
=======
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
>>>>>>> 120c0d709138d4e3c1f903d61184ccd38bf281d2

  return (
    <Layout
      sideContent=
      {
        <Sidebar
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
            onClose={handleCloseTrainPanel}
<<<<<<< HEAD
=======
          />
        ) : selectedStation ? (
          <StationDetailPanel
            station={selectedStation}
            onClose={handleCloseStationPanel}
            onTrainSelect={handleTrainSelect}
>>>>>>> 120c0d709138d4e3c1f903d61184ccd38bf281d2
          />
        ) : undefined
      }
    />
  );
}

export default App;
