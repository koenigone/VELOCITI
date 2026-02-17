import { useState } from 'react';
import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';

export type Train = {
  trainId: string;
  originLocation: string;
  destinationLocation: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  originTiploc: string;
  destinationTiploc: string;
};

function App() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);

  return (
    <Layout
      sideContent={
        <Sidebar
          trains={trains}
          setTrains={setTrains}
          onSelectTrain={setSelectedTrain}
        />
      }
      mapContent={
        <MapArea selectedTrain={selectedTrain} />
      }
    />
  );
}

export default App;




