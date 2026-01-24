import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';

const Home = () => {
   const socket = useSocket();
   const [nickname, setNickname] = useState('');
   const [roomId, setRoomId] = useState('');

   const handleCreate = () => {
      if (!nickname) return alert('Iltimos, ismingizni kiriting!');
      socket.emit('createRoom', { nickname });
   };

   const handleJoin = () => {
      if (!nickname || !roomId) return alert('Ism va Room ID kiriting!');
      socket.emit('joinRoom', { nickname, roomId: roomId.toUpperCase() });
   };

   return (
      <div className="home-container">
         <h1>UNOHub</h1>
         <input
            type="text"
            placeholder="Ismingiz (Nickname)"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
         />

         <div className="actions">
            <button className="btn-primary" onClick={handleCreate}>Xona yaratish</button>

            <div className="join-section">
               <input
                  type="text"
                  placeholder="Xona ID (Room ID)"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
               />
               <button className="btn-secondary" onClick={handleJoin}>Qo‘shilish</button>
            </div>
         </div>
      </div>
   );
};

export default Home;
