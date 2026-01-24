import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import Home from './components/Home';
import Lobby from './components/Lobby';
import GameBoard from './components/Game/Board';
import './App.css';

function Content() {
  const socket = useSocket();
  const [view, setView] = useState('home'); // home, lobby, game
  const [gameState, setGameState] = useState(null); // shared public state
  const [myHand, setMyHand] = useState([]); // private hand
  const [lobbyState, setLobbyState] = useState({ roomId: null, players: [], isAdmin: false, myId: null });
  const [error, setError] = useState(null);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Room Events
    socket.on('room:created', ({ roomId, adminId }) => {
      setLobbyState(prev => ({ ...prev, roomId, isAdmin: true, myId: socket.id }));
      setView('lobby');
    });

    socket.on('room:joined', ({ roomId, playerId }) => {
      setLobbyState(prev => ({ ...prev, roomId, isAdmin: false, myId: socket.id }));
      setView('lobby');
    });

    // Game/Lobby State Updates
    socket.on('stateUpdate', (data) => {
      // data contains full public state + 'me' private data if updated
      console.log('State Update:', data);
      setGameState(data);

      if (data.status === 'playing' && view !== 'game') {
        setView('game');
      }

      if (data.me && data.me.hand) {
        setMyHand(data.me.hand);
      }

      if (data.status === 'finished') {
        // Handle finish
      }
    });

    // Specific Hand Update (e.g. after draw)
    socket.on('handUpdate', (hand) => {
      setMyHand(hand);
    });

    socket.on('gameFinished', ({ winner }) => {
      setWinner(winner);
      setTimeout(() => {
        alert(`G‘OLIB: ${winner}!`);
        window.location.reload();
      }, 1000);
    });

    socket.on('error:msg', ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('stateUpdate');
      socket.off('handUpdate');
      socket.off('gameFinished');
      socket.off('error:msg');
    };
  }, [socket, view]);

  return (
    <>
      {error && <div className="error-toast">{error}</div>}
      {view === 'home' && <Home />}
      {view === 'lobby' && <Lobby gameState={gameState} lobbyState={lobbyState} />}
      {view === 'game' && <GameBoard gameState={gameState} myHand={myHand} myId={lobbyState.myId} />}
    </>
  );
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
