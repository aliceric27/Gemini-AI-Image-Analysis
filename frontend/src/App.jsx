import Layout from './components/layout/Layout';
import { AnalysisProvider } from './context/AnalysisContext';
import './App.css'

function App() {
  return (
    <AnalysisProvider>
      <Layout />
    </AnalysisProvider>
  );
}

export default App
