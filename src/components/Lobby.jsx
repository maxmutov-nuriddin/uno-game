import React from 'react';
import { useSocket } from '../context/SocketContext';

const Lobby = ({ gameState }) => {
   const socket = useSocket();
   const { roomId, players, me } = gameState;
   const isHost = players[0]?.id === me.id;

   const handleStart = () => {
      socket.emit('startGame');
   };

   return (
      <div className="lobby-container">
         <h2>Xona ID: <span className="highlight">{roomId}</span></h2>

         <div className="player-list">
            <h3>O‘yinchilar ({players.length}):</h3>
            <ul>
               {players.map(p => (
                  <li key={p.id} className={p.id === me.id ? 'me' : ''}>
                     {p.name} {p.id === players[0].id ? '👑' : ''}
                  </li>
               ))}
            </ul>
         </div>

         {isHost ? (
            <button className="btn-primary start-btn" onClick={handleStart}>
               O‘yinni boshlash
            </button>
         ) : (
            <p className="waiting-text">Admin o‘yinni boshlashini kuting...</p>
         )}
      </div>
   );
};

export default Lobby;
