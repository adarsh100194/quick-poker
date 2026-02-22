import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateGame from './pages/CreateGame';
import JoinGame from './pages/JoinGame';
import Lobby from './pages/Lobby';
import GameTable from './pages/GameTable';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateGame />} />
      <Route path="/join" element={<JoinGame />} />
      <Route path="/lobby/:code" element={<Lobby />} />
      <Route path="/table/:code" element={<GameTable />} />
    </Routes>
  );
}

export default App;
