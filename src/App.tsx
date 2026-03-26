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

  // station clicked on the map — passed to sidebar so it triggers a search
  const [mapClickedStation, setMapClickedStation] = useState<TiplocData | null>(null);

  const [mobileView, setMobileView] = useState<"search" |"station" | "train">("search"); 


  const handleLiveTrainUpdate = useCallback((updatedTrain: Train) => {
    setSelectedTrain(current => {
      if (!current || current.trainId !== updatedTrain.trainId) {
        return current;
      }

      return updatedTrain;
    });
  }, []);

  const { liveStatus } = useLiveSelectedTrain(selectedTrain, handleLiveTrainUpdate);

  const handleLocationSelect = useCallback((lat: number, lng: number, stationCode: string) => {
    setMapTarget({ lat, lng, zoom: 14 });
    setSelectedTrain(null);
    setSearchedStation(stationCode);
    setMobileView("station");
  }, []);

  const handleStationSelect = useCallback((station: TiplocData) => {
    setSelectedTrain(null);
    setMapClickedStation(station);
    setMobileView("station")
  }, []);

  const handleTrainSelect = useCallback((train: Train) => {
    setSelectedTrain(train);
    setMobileView("train"); 
}, []);

  const handleCloseTrainPanel = useCallback(() => {
    setSelectedTrain(null);
    setMobileView("search");
}, []);

  return (
    <Layout
      sideContent=
      {
        <Sidebar
          onLocationSelect={handleLocationSelect}
          onTrainSelect={handleTrainSelect}
          externalStation={mapClickedStation}
          mobileView={mobileView}
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
      panelContent={
        selectedTrain ? (
          <TrainDetailPanel
            train={selectedTrain}
            liveStatus={liveStatus}
            onClose={handleCloseTrainPanel}
          />
        ) : undefined
      }
    />
  );
}

export default App;
