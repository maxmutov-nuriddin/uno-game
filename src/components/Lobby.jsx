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
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
         className="lobby-container premium-box"
      >
         <h2>Xona ID: <span className="highlight-code">{roomId}</span></h2>
         <p className="sub-text">Do‘stlaringizga bering</p>

         <div className="player-list-lobby">
            <h3>O‘yinchilar ({players.length}/10)</h3>
            <ul>
               {players.map(p => (
                  <motion.li
                     key={p.id}
                     initial={{ x: -20, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                  >
                     <span className="p-avatar">{p.name[0].toUpperCase()}</span>
                     <span className="p-name">{p.name} {p.id === lobbyState.myId ? '(Siz)' : ''}</span>
                  </motion.li>
               ))}
            </ul>
         </div>

         {isAdmin ? (
            <div className="admin-controls">
               <button className="btn-primary big-btn" onClick={handleStart}>
                  O‘yinni Boshlash 🚀
               </button>
            </div>
         ) : (
            <div className="waiting-pulse">
               Admin boshlashini kuting...
            </div>
         )}
      </motion.div>
   );
};

export default Lobby;
