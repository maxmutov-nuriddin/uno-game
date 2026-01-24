/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import Home from './components/Home';
import Lobby from './components/Lobby';
import GameBoard from './components/Game/Board';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

function Content() {
  const socket = useSocket();
  const [view, setView] = useState('home');
  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [lobbyState, setLobbyState] = useState({ roomId: null, players: [], isAdmin: false, myId: null });
  const [toasts, setToasts] = useState([]); // { id, type, message }
  const [winner, setWinner] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const addToast = (type, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if (!socket) return;

    // Restore Logic
    const storedSession = localStorage.getItem('uno_session');
    if (storedSession) {
      try {
        const { roomId, sessionToken } = JSON.parse(storedSession);
        socket.emit('session:restore', { roomId, sessionToken });
      } catch (e) {
        localStorage.removeItem('uno_session');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsRestoring(false);
      }
    } else {
      setIsRestoring(false);
    }

    const onRestored = ({ ok, role, roomId }) => {
      setIsRestoring(false);
      if (ok) {
        setLobbyState(prev => ({ ...prev, roomId, isAdmin: role === 'admin', myId: socket.id }));
      } else {
        localStorage.removeItem('uno_session');
      }
    };
    socket.on('session:restored', onRestored);

    return () => socket.off('session:restored', onRestored);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleJoin = ({ roomId, sessionToken, role }) => {
      localStorage.setItem('uno_session', JSON.stringify({ roomId, sessionToken }));
      setLobbyState(prev => ({ ...prev, roomId, isAdmin: role === 'admin', myId: socket.id }));
      setView('lobby');
    };

    socket.on('room:created', handleJoin);
    socket.on('room:joined', handleJoin);

    socket.on('stateUpdate', (data) => {
      setGameState(data);
      if (data.status === 'playing') setView('game');
      else if (data.status === 'lobby') setView('lobby');

      if (data.me) {
        setMyHand(data.me.hand);
        setLobbyState(prev => ({ ...prev, myId: data.me.id }));
      }
    });

    socket.on('handUpdate', (hand) => setMyHand(hand));

    socket.on('gameFinished', ({ winner }) => setWinner(winner));

    // Toast Handlers
    socket.on('toast', ({ type, message }) => addToast(type, message));
    socket.on('error:msg', ({ message }) => addToast('error', message));

    return () => {
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('stateUpdate');
      socket.off('handUpdate');
      socket.off('gameFinished');
      socket.off('toast');
      socket.off('error:msg');
    };
  }, [socket]);

  if (isRestoring) return <div className="loading-screen glass-panel">Loading...</div>;

  return (
    <>
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`glass-toast ${t.type}`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {view === 'home' && <Home />}
      {view === 'lobby' && <Lobby gameState={gameState} lobbyState={lobbyState} />}
      {view === 'game' && (
        <GameBoard
          gameState={gameState}
          myHand={myHand}
          myId={lobbyState.myId}
          winner={winner}
          onExit={() => {
            localStorage.removeItem('uno_session');
            window.location.reload();
          }}
        />
      )}
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
