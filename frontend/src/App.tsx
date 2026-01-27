import { Routes, Route, Link ,Navigate  } from 'react-router-dom';
import ReadLog from './pages/ReadLog';

function App() {
  return (
    <div>
      <Routes> 
        <Route path="/" element={<Navigate to="/read" replace />} /> 
        <Route path="/read" element={<ReadLog />} /> 
        </Routes>
    </div>
  );
}

export default App;
