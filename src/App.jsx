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
  const [gameSummary, setGameSummary] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const addToast = (type, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const resetToHome = (message) => {
    localStorage.removeItem('uno_session');
    setView('home');
    setGameState(null);
    setMyHand([]);
    setWinner(null);
    setGameSummary(null);
    setLobbyState({ roomId: null, players: [], isAdmin: false, myId: null });
    if (message) addToast('error', message);
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
      } else {
        setMyHand([]);
        setLobbyState(prev => ({ ...prev, myId: null }));
      }

      if (data.gameSummary) {
        setGameSummary(data.gameSummary);
      }
    });

    socket.on('handUpdate', (hand) => setMyHand(hand));

    socket.on('gameFinished', ({ winner, summary }) => {
      setWinner(winner);
      if (summary) setGameSummary(summary);
    });
    socket.on('room:closed', () => resetToHome('Xona yopildi'));

    // Toast Handlers
    socket.on('toast', ({ type, message }) => addToast(type, message));
    socket.on('error:msg', ({ message }) => addToast('error', message));

    return () => {
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('stateUpdate');
      socket.off('handUpdate');
      socket.off('gameFinished');
      socket.off('room:closed');
      socket.off('toast');
      socket.off('error:msg');
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const updateVisibility = () => {
      const isAway = document.hidden || !document.hasFocus();
      socket.emit('player:visibility', { isAway });
    };
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    window.addEventListener('blur', updateVisibility);
    window.addEventListener('focus', updateVisibility);
    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
      window.removeEventListener('blur', updateVisibility);
      window.removeEventListener('focus', updateVisibility);
    };
  }, [socket]);

  if (isRestoring) return <div className="loading-screen glass-panel">Yuklanmoqda...</div>;

  return (
    <>
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              className={`glass-toast ${t.type}`}
            >
              <div className="toast-icon">
                {t.type === 'error' ? '✕' : t.type === 'success' ? '✓' : 'ℹ'}
              </div>
              <div className="toast-message">{t.message}</div>
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
          gameSummary={gameSummary}
          onExit={() => {
            if (socket) {
              socket.emit('room:leave');
            }
            resetToHome();
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
