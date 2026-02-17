import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';

// export type StopStatus = 'LATE' | 'ON_TIME' | 'EARLY';

// export type Stop = {
//   id: string;
//   locationName: string;
//   expectedTime: string;
//   actualOrEstimatedTime: string;
//   status: StopStatus;
// };

function App() {

  return (
  <Layout
    sideContent={<Sidebar />}
    mapContent={
      <MapArea />
    }
  />
);

}

export default App;
