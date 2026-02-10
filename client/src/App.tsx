import { Routes, Route } from 'react-router-dom';
import { RoomProvider } from './contexts/RoomContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';

export default function App() {
  return (
    <AccessibilityProvider>
      <RoomProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
        </Routes>
      </RoomProvider>
    </AccessibilityProvider>
  );
}
