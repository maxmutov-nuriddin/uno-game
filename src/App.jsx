import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import Home from './components/Home';
import Lobby from './components/Lobby';
import GameBoard from './components/Game/Board';
import './App.css';

function Content() {
  const socket = useSocket();
  const [gameState, setGameState] = useState(null); // { roomId, status, players, me, activeCard, ... }
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('roomCreated', ({ roomId }) => {
      console.log('Room created:', roomId);
    });

    socket.on('gameState', (state) => {
      console.log('Game State:', state);
      setGameState(state);
      setError(null);
    });

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    socket.on('gameFinished', ({ winner }) => {
      alert(`O‘yin tugadi! G‘olib: ${winner}`);
      window.location.reload();
    });

    return () => {
      socket.off('roomCreated');
      socket.off('gameState');
      socket.off('error');
    };
  }, [socket]);

  if (!gameState) {
    return <Home />;
  }

  if (gameState.status === 'lobby') {
    return <Lobby gameState={gameState} />;
  }

  return <GameBoard gameState={gameState} />;
}

function App() {
  return (
    <SocketProvider>
      <div className="app-container">
        <Content />
      </div>
    </SocketProvider>
  );
}

export default App;
