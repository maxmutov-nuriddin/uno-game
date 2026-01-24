import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';

const Home = () => {
   const socket = useSocket();
   const [nickname, setNickname] = useState('');
   const [roomId, setRoomId] = useState('');
   const [startCards, setStartCards] = useState(7);
   const [mode, setMode] = useState('menu'); // menu, create, join

   const handleCreate = () => {
      if (!nickname) return alert('Ismingizni kiriting!');
      socket.emit('room:create', { nickname, startCardsCount: startCards });
   };

   const handleJoin = () => {
      if (!nickname || !roomId) return alert('Ism va Room ID kiriting!');
      socket.emit('room:join', { nickname, roomId: roomId.toUpperCase() });
   };

   return (
      <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="home-container premium-box"
      >
         <h1 className="logo">UNO<span>Hub</span></h1>

         <div className="input-group">
            <label>Nickname</label>
            <input
               type="text"
               placeholder="Ismingiz..."
               value={nickname}
               onChange={e => setNickname(e.target.value)}
            />
         </div>

         {mode === 'menu' && (
            <div className="menu-buttons">
               <button className="btn-primary" onClick={() => setMode('create')}>Xona Yaratish</button>
               <button className="btn-secondary" onClick={() => setMode('join')}>Qo‘shilish</button>
            </div>
         )}

         {mode === 'create' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sub-menu">
               <div className="input-group">
                  <label>Boshlang‘ich kartalar: {startCards}</label>
                  <input
                     type="range" min="2" max="10"
                     value={startCards}
                     onChange={e => setStartCards(e.target.value)}
                  />
               </div>
               <button className="btn-primary" onClick={handleCreate}>Yaratish</button>
               <button className="btn-text" onClick={() => setMode('menu')}>Ortga</button>
            </motion.div>
         )}

         {mode === 'join' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sub-menu">
               <div className="input-group">
                  <label>Room ID</label>
                  <input
                     type="text"
                     placeholder="Xona kodi"
                     value={roomId}
                     onChange={e => setRoomId(e.target.value)}
                  />
               </div>
               <button className="btn-primary" onClick={handleJoin}>Kirish</button>
               <button className="btn-text" onClick={() => setMode('menu')}>Ortga</button>
            </motion.div>
         )}

      </motion.div>
   );
};

export default Home;
