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

   const handleCloseRoom = () => {
      socket.emit('room:close');
   };

   return (
      <motion.div
         initial={{ opacity: 0, scale: 0.9, y: 30 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         transition={{ duration: 0.8, ease: "easeOut" }}
         className="lobby-container premium-box"
      >
         <div>
            <div className="lobby-room-label">ROOM ID</div>
            <h2 className="lobby-room-id">{roomId}</h2>
         </div>

         <div className="player-list-lobby">
            <h3>PLAYERS ({players.length})</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
               {players.map((p, idx) => (
                  <motion.li
                     key={p.id}
                     initial={{ x: -20, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ delay: idx * 0.1 }}
                     className="player-item-lobby"
                  >
                     <div className="player-avatar-lobby">
                        {p.name[0].toUpperCase()}
                     </div>
                     <span className="player-name-lobby">{p.name}</span>
                     {p.id === lobbyState.myId && <span className="player-badge-lobby">YOU</span>}
                  </motion.li>
               ))}
            </ul>
         </div>

         <div style={{ marginTop: '16px' }}>
            {isAdmin ? (
               <div className="form-row">
                  <button className="btn-glass btn-primary" onClick={handleStart}>
                     START GAME
                  </button>
                  <button className="btn-glass btn-secondary" onClick={handleCloseRoom}>
                     CLOSE ROOM
                  </button>
               </div>
            ) : (
               <div style={{ padding: '20px', opacity: 0.5, fontStyle: 'italic', fontSize: '0.9rem', letterSpacing: '1px' }}>
                  WAITING FOR HOST...
               </div>
            )}
         </div>
      </motion.div>
   );
};

export default Lobby;
