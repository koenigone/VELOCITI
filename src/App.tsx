import { useState } from 'react';
import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';

// 1) Describe one stop in the schedule
export type StopStatus = 'LATE' | 'ON_TIME' | 'EARLY';

export type Stop = {
  id: string;
  locationName: string;
  expectedTime: string;
  actualOrEstimatedTime: string;
  status: StopStatus;
};

function App() {
  // 2) Remember which stops belong to the currently selected journey
  const [selectedStops, setSelectedStops] = useState<Stop[] | null>(null);

  return (
  <Layout
    sideContent={<Sidebar stops={selectedStops} />}
    mapContent={
      <MapArea onJourneyClick={(stops: Stop[]) => setSelectedStops(stops)} />
    }
  />
);

}

export default App;
