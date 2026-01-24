import React from 'react';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';

const Lobby = ({ gameState, lobbyState }) => {
   const socket = useSocket();
   const { players } = gameState || { players: [] };
   const { roomId, isAdmin } = lobbyState;

   const handleStart = () => {
      socket.emit('game:start');
   };

   return (
      <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         className="lobby-container premium-box"
         style={{ marginTop: '10vh' }}
      >
         <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.6, letterSpacing: '2px' }}>ROOM ID</span>
            <h2 style={{ fontSize: '3rem', margin: '5px 0', fontFamily: 'monospace', color: 'var(--accent)' }}>{roomId}</h2>
         </div>

         <div className="player-list-lobby" style={{ textAlign: 'left', margin: '30px 0' }}>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
               PLAYERS ({players.length})
            </h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
               {players.map(p => (
                  <motion.li
                     key={p.id}
                     initial={{ x: -10, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     style={{
                        padding: '12px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', gap: '15px'
                     }}
                  >
                     <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', background: '#333',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                     }}>
                        {p.name[0]}
                     </div>
                     <span style={{ fontSize: '1.1rem' }}>{p.name}</span>
                     {p.id === lobbyState.myId && <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>(YOU)</span>}
                  </motion.li>
               ))}
            </ul>
         </div>

         {isAdmin ? (
            <button className="btn-glass btn-primary" onClick={handleStart}>
               START GAME 🚀
            </button>
         ) : (
            <div style={{ padding: '20px', opacity: 0.7, fontStyle: 'italic' }}>
               Waiting for host to start...
            </div>
         )}
      </motion.div>
   );
};

export default Lobby;
