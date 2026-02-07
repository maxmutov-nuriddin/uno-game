/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { SocketProvider } from './context/SocketContext';
import { useSocket, useSocketControls } from './context/useSocket';
import Home from './components/Home';
import Lobby from './components/Lobby';
import GameBoard from './components/Game/Board';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const INITIAL_TRANSPORT_STATUS = {
  hasConnection: false,
  isSyncing: false,
  pendingWrites: 0,
  pingMs: null,
  lastSyncAt: null,
  lastError: null,
};

function Content() {
  const socket = useSocket();
  const { networkMode, setNetworkMode } = useSocketControls();
  const [view, setView] = useState('home');
  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [lobbyState, setLobbyState] = useState({ roomId: null, players: [], isAdmin: false, myId: null });
  const [toasts, setToasts] = useState([]); // { id, type, message }
  const [winner, setWinner] = useState(null);
  const [gameSummary, setGameSummary] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [transportStatus, setTransportStatus] = useState(INITIAL_TRANSPORT_STATUS);

  const addToast = useCallback((type, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const resetToHome = useCallback((message) => {
    localStorage.removeItem('uno_session');
    setView('home');
    setGameState(null);
    setMyHand([]);
    setWinner(null);
    setGameSummary(null);
    setLobbyState({ roomId: null, players: [], isAdmin: false, myId: null });
    if (message) addToast('error', message);
  }, [addToast]);

  useEffect(() => {
    if (!socket) return;

    // Restore Logic
    const storedSession = localStorage.getItem('uno_session');
    if (storedSession) {
      try {
        const { roomId, sessionToken, networkMode: storedMode } = JSON.parse(storedSession);
        if (storedMode && storedMode !== networkMode) {
          setNetworkMode(storedMode);
          return;
        }
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
  }, [socket, networkMode, setNetworkMode]);

  useEffect(() => {
    if (!socket) return;

    const onTransportStatus = (status) => {
      setTransportStatus((prev) => ({ ...prev, ...status }));
    };

    socket.on('transport:status', onTransportStatus);
    return () => socket.off('transport:status', onTransportStatus);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleJoin = ({ roomId, sessionToken, role }) => {
      localStorage.setItem('uno_session', JSON.stringify({ roomId, sessionToken, networkMode }));
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
  }, [socket, networkMode, resetToHome, addToast]);

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

  const statusTone = transportStatus.lastError
    ? 'error'
    : transportStatus.hasConnection
      ? 'ok'
      : 'pending';
  const statusLabel = transportStatus.lastError
    ? 'ERROR'
    : transportStatus.hasConnection
      ? (transportStatus.isSyncing ? 'SYNC' : 'ONLINE')
      : 'CONNECT';
  const pingLabel = Number.isFinite(transportStatus.pingMs) ? `${transportStatus.pingMs}ms` : '--';

  return (
    <>
      <div className="network-layer">
        <div className={`network-pill ${statusTone}`}>
          <span className={`network-dot ${transportStatus.isSyncing ? 'syncing' : ''}`} />
          <span className="network-label">{statusLabel}</span>
          <span className="network-ping">{pingLabel}</span>
          {transportStatus.pendingWrites > 0 && (
            <span className="network-writes">{transportStatus.pendingWrites}</span>
          )}
        </div>
        {transportStatus.pendingWrites > 0 && (
          <div className="network-loading">Yuklanmoqda...</div>
        )}
      </div>

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
