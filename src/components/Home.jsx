import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';

const Home = () => {
   const socket = useSocket();
   const [nickname, setNickname] = useState('');
   const [roomId, setRoomId] = useState('');
   const [startCards, setStartCards] = useState(7);
   const [autoDrawEnabled, setAutoDrawEnabled] = useState(true);
   const [mode, setMode] = useState('menu');

   const handleCreate = () => {
      if (!nickname) return;
      socket.emit('room:create', { nickname, startCardsCount: startCards, autoDrawEnabled });
   };

   const handleJoin = () => {
      if (!nickname || !roomId) return;
      socket.emit('room:join', { nickname, roomId });
   };

   return (
      <motion.div
         initial={{ opacity: 0, scale: 0.9, y: 30 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         transition={{ duration: 0.8, ease: "easeOut" }}
         className="home-container premium-box"
      >
         <div className="home-backdrop" aria-hidden="true"></div>
         <div className="home-slice" aria-hidden="true"></div>
         <div className="home-hero">
            <div className='home-box'>
               {/* <div className="home-badge">PLAY HUB</div> */}
               <h1 className="logo">
                  UNO<span>Hub</span>
               </h1>
            </div>
            <div className="home-orb" aria-hidden="true"></div>
         </div>


         {mode === 'menu' && (
            <div className="menu-buttons">
               <button className="btn-glass btn-primary" onClick={() => setMode('create')}>XONA YARATISH</button>
               <button className="btn-glass btn-secondary" onClick={() => setMode('join')}>QO‘SHILISH</button>
            </div>
         )}

         {mode === 'create' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sub-menu">
               <div className="input-group">
                  <label>NICKNAME</label>
                  <input
                     type="text"
                     placeholder="Ismingiz..."
                     value={nickname}
                     onChange={e => setNickname(e.target.value)}
                  />
               </div>
               <div className="input-group" style={{ margin: '20px 0' }}>
                  <label>BOSHLANGʻICH KARTALAR: {startCards}</label>
                  <input
                     type="range" min="5" max="10"
                     style={{ width: '100%', accentColor: 'var(--primary)' }}
                     value={startCards}
                     onChange={e => setStartCards(e.target.value)}
                  />
               </div>
               <div className="input-group" style={{ margin: '20px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <input
                        type="checkbox"
                        checked={autoDrawEnabled}
                        onChange={e => setAutoDrawEnabled(e.target.checked)}
                     />
                     AVTO TORTISH
                  </label>
               </div>
               <div className="form-row">
                  <button className="btn-glass btn-primary" onClick={handleCreate}>OʻYINNI BOSHLASH</button>
                  <button className="btn-glass btn-secondary" onClick={() => setMode('menu')}>ORTGA</button>
               </div>
            </motion.div>
         )}

         {mode === 'join' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sub-menu">
               <div className="input-group">
                  <label>NICKNAME</label>
                  <input
                     type="text"
                     placeholder="Ismingiz..."
                     value={nickname}
                     onChange={e => setNickname(e.target.value)}
                  />
               </div>
               <div className="input-group" style={{ margin: '20px 0' }}>
                  <label>XONA ID</label>
                  <input
                     type="text"
                     inputMode="numeric"
                     pattern="[0-9]*"
                     placeholder="RAQAMLI ID"
                     value={roomId}
                     onChange={e => setRoomId(e.target.value.replace(/[^0-9]/g, ''))}
                  />
               </div>
               <div className="form-row">
                  <button className="btn-glass btn-primary" onClick={handleJoin}>XONAGA KIRISH</button>
                  <button className="btn-glass btn-secondary" onClick={() => setMode('menu')}>ORTGA</button>
               </div>
            </motion.div>
         )}

      </motion.div>
   );
};

export default Home;

