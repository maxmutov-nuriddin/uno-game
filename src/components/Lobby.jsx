import React from 'react';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';

const Lobby = ({ gameState, lobbyState }) => {
   const socket = useSocket();
   const { players } = gameState || { players: [] };
   const { roomId, isAdmin } = lobbyState;
   const allReady = players.length >= 2 && players.every(p => p.ready);
   const mePlayer = players.find(p => p.id === lobbyState.myId);
   const adminReady = isAdmin && !!mePlayer?.ready;

   const handleStart = () => {
      socket.emit('game:start');
   };

   const handleCloseRoom = () => {
      socket.emit('room:close');
   };

   const handleReadyToggle = () => {
      socket.emit('player:ready', { isReady: !mePlayer?.ready });
   };

   return (
      <motion.div
         initial={{ opacity: 0, scale: 0.9, y: 30 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         transition={{ duration: 0.8, ease: "easeOut" }}
         className="lobby-container premium-box"
      >
         <div>
            <div className="lobby-room-label">XONA ID</div>
            <h2 className="lobby-room-id">{roomId}</h2>
         </div>

         <div className="player-list-lobby">
            <h3>OʻYINCHILAR ({players.length})</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
               {players.map((p, idx) => (
                  <motion.li
                     key={p.id}
                     initial={{ x: -20, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ delay: idx * 0.1 }}
                     className="player-item-lobby"
                  >
                     <div className="player-avatar-lobby" style={{ background: p.avatarColor || 'rgba(255,255,255,0.05)' }}>
                        {p.avatarIcon === 'uno' ? (
                           <img className="avatar-icon-img" src="/unocards/uno-icon.png" alt="UNO" />
                        ) : (
                           p.avatarIcon || p.name[0].toUpperCase()
                        )}
                     </div>
                     <span className="player-name-lobby">{p.name}</span>
                     <span className={`player-ready ${p.ready ? 'ready' : ''}`}>
                        {p.ready ? 'TAYYOR' : 'KUTYAPTI'}
                     </span>
                     {p.id === lobbyState.myId && <span className="player-badge-lobby">SIZ</span>}
                  </motion.li>
               ))}
            </ul>
         </div>

         <div style={{ marginTop: '16px' }}>
            {isAdmin ? (
               <div className="form-row">
                  <button className={`btn-glass btn-secondary ${mePlayer?.ready ? '' : 'btn-ready'}`} onClick={handleReadyToggle}>
                     {mePlayer?.ready ? 'TAYYOR' : 'TAYYORMAN'}
                  </button>
                  <button className="btn-glass btn-primary" onClick={handleStart} disabled={!allReady}>
                     OʻYINNI BOSHLASH
                  </button>
                  <button className="btn-glass btn-secondary" onClick={handleCloseRoom} disabled={adminReady}>
                     XONANI YOPISH
                  </button>
                  {adminReady && (
                     <div className="lobby-warning">
                        Xonani yopish uchun tayyorlikni o'chiring.
                     </div>
                  )}
               </div>
            ) : (
               <div style={{ display: 'grid', gap: '12px' }}>
                  <button className={`btn-glass btn-secondary ${mePlayer?.ready ? '' : 'btn-ready'}`} onClick={handleReadyToggle}>
                     {mePlayer?.ready ? 'TAYYOR' : 'TAYYORMAN'}
                  </button>
                  <div style={{ padding: '10px', opacity: 0.6, fontStyle: 'italic', fontSize: '0.85rem', letterSpacing: '1px' }}>
                     HOSTNI KUTMOQDA...
                  </div>
               </div>
            )}
         </div>
      </motion.div>
   );
};

export default Lobby;
