import Layout from './layout';
import Sidebar from './components/layout/sidebar';
import MapArea from './components/map/mapArea';

function App() {
  return (
    <Layout
      sideContent={<Sidebar />}
      mapContent={<MapArea />}
    />
  );
}

export default App;