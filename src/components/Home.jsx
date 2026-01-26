import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';

const Home = () => {
   const socket = useSocket();
   const avatarColors = ['#ff5252', '#ffb300', '#00c853', '#29b6f6', '#ab47bc', '#ff7043', '#26a69a', '#5c6bc0'];
   const avatarIcons = [
      '\ud83d\ude0e',
      '\ud83d\ude3a',
      '\ud83e\udd16',
      '\ud83d\udc27',
      '\ud83e\udd8a',
      '\ud83d\udc2f',
      '\ud83d\udc3c'
   ];

   const [nickname, setNickname] = useState('');
   const [roomId, setRoomId] = useState('');
   const [startCards, setStartCards] = useState(7);
   const [startCardsInput, setStartCardsInput] = useState('7');
   const [startCardsOpen, setStartCardsOpen] = useState(false);
   const [autoDrawEnabled, setAutoDrawEnabled] = useState(true);
   const [mode, setMode] = useState('menu');
   const [nicknameNotice, setNicknameNotice] = useState('');
   const [roomIdNotice, setRoomIdNotice] = useState('');
   const [avatarColor, setAvatarColor] = useState(avatarColors[0]);
   const [avatarIcon, setAvatarIcon] = useState(avatarIcons[0]);
   
   const showNicknameNotice = (message) => {
      setNicknameNotice(message);
      setTimeout(() => setNicknameNotice(''), 2000);
   };

   const showRoomIdNotice = (message) => {
      setRoomIdNotice(message);
      setTimeout(() => setRoomIdNotice(''), 2000);
   };

   const clampStartCardsInput = (value) => {
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) return 8;
      return Math.min(12, Math.max(8, parsed));
   };

   const handleCreate = () => {
      if (!nickname) {
         showNicknameNotice("Ismingizni kiriting.");
         return;
      }
      socket.emit('room:create', { nickname, startCardsCount: startCards, autoDrawEnabled, avatarColor, avatarIcon });
   };

   const handleJoin = () => {
      if (!nickname) {
         showNicknameNotice("Ismingizni kiriting.");
         return;
      }
      if (!roomId) {
         showRoomIdNotice("Xona ID kiriting.");
         return;
      }
      socket.emit('room:join', { nickname, roomId, avatarColor, avatarIcon });
   };

   useEffect(() => {
      if (!socket) return;
      const onError = ({ message }) => {
         if (mode !== 'join') return;
         if (message === 'Xona topilmadi!') {
            showRoomIdNotice("Bunday xona yo'q.");
         }
      };
      socket.on('error:msg', onError);
      return () => socket.off('error:msg', onError);
   }, [socket, mode]);


   return (
      <motion.div
         initial={{ opacity: 0, scale: 0.9, y: 30 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         transition={{ duration: 0.8, ease: 'easeOut' }}
         className="home-container premium-box"
      >
         <div className="home-backdrop" aria-hidden="true"></div>
         <div className="home-slice" aria-hidden="true"></div>
         <div className="home-hero">
            <div className="home-box">
               <div className="home-kicker">UNO ONLINE</div>
               <h1 className="logo">
                  UNO<span>Hub</span>
               </h1>
               <p className="home-tagline">
                  LAN orqali tezkor UNO. Minimal interfeys, tezkor o'yin.
               </p>
               <div className="home-stats">
                  <div>
                     <span>2-10</span>
                     <small>O'YINCHI</small>
                  </div>
                  <div>
                     <span>LAN</span>
                     <small>Tez aloqa</small>
                  </div>
               </div>
            </div>
         </div>

         {mode === 'menu' && (
            <div className="menu-buttons home-actions">
               <button className="btn-glass btn-primary" onClick={() => setMode('create')}>XONA YARATISH</button>
               <button className="btn-glass btn-secondary" onClick={() => setMode('join')}>QO'SHILISH</button>
            </div>
         )}

         {mode === 'create' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sub-menu">
               <div className="form-header">
                  <div className="input-group">
                     <label>NICKNAME</label>
                     <input
                        type="text"
                        placeholder="Ismingiz..."
                        value={nickname}
                        onChange={e => setNickname(e.target.value)}
                     />
                     {nicknameNotice && <div className="form-notice">{nicknameNotice}</div>}
                  </div>
                  <div className="home-avatar-preview">
                     <div className="avatar-preview" style={{ background: avatarColor }}>
                        <span>{avatarIcon}</span>
                     </div>
                     <div className="avatar-preview-label">AVATAR</div>
                  </div>
               </div>
               <div className="avatar-picker">
                  <div className="avatar-section">
                     <div className="avatar-label">AVATAR RANGI</div>
                     <div className="avatar-swatches">
                        {avatarColors.map(color => (
                           <button
                              key={color}
                              type="button"
                              className={`avatar-swatch ${avatarColor === color ? 'selected' : ''}`}
                              style={{ background: color }}
                              onClick={() => setAvatarColor(color)}
                              aria-label={`Avatar color ${color}`}
                           />
                        ))}
                     </div>
                  </div>
                  <div className="avatar-section">
                     <div className="avatar-label">AVATAR IKKONASI</div>
                     <div className="avatar-icons">
                        {avatarIcons.map(icon => (
                           <button
                              key={icon}
                              type="button"
                              className={`avatar-icon ${avatarIcon === icon ? 'selected' : ''}`}
                              onClick={() => setAvatarIcon(icon)}
                              aria-label={`Avatar icon ${icon}`}
                           >
                              {icon}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
               <div className="input-group" style={{ margin: '20px 0' }}>
                  <label>BOSHLANG'ICH KARTALAR</label>
                  <div className="select-field">
                     <button
                        type="button"
                        className="select-trigger"
                        onClick={() => {
                           setStartCardsInput(String(Math.max(8, startCards)));
                           setStartCardsOpen(prev => !prev);
                        }}
                     >
                        {startCards}
                        <span className="select-caret">v</span>
                     </button>
                     {startCardsOpen && (
                        <div className="select-panel">
                           <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={startCardsInput}
                              onChange={e => {
                                 const nextValue = e.target.value.replace(/[^0-9]/g, '');
                                 if (nextValue.length === 0 || nextValue.length <= 2) {
                                    setStartCardsInput(nextValue);
                                 }
                              }}
                              onBlur={() => {
                                 const next = clampStartCardsInput(startCardsInput);
                                 setStartCards(next);
                                 setStartCardsInput(String(next));
                              }}
                              placeholder="8-12"
                           />
                           <div className="select-options">
                              {[4, 5, 6, 7].map(value => (
                                 <button
                                    key={value}
                                    type="button"
                                    className="select-option"
                                    onClick={() => {
                                       setStartCards(value);
                                       setStartCardsInput(String(value));
                                       setStartCardsOpen(false);
                                    }}
                                 >
                                    {value}
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
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
                  <button className="btn-glass btn-primary" onClick={handleCreate}>O'YINNI BOSHLASH</button>
                  <button className="btn-glass btn-secondary" onClick={() => setMode('menu')}>ORTGA</button>
               </div>
            </motion.div>
         )}

         {mode === 'join' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sub-menu">
               <div className="form-header">
                  <div className="input-group">
                     <label>NICKNAME</label>
                     <input
                        type="text"
                        placeholder="Ismingiz..."
                        value={nickname}
                        onChange={e => setNickname(e.target.value)}
                     />
                     {nicknameNotice && <div className="form-notice">{nicknameNotice}</div>}
                  </div>
                  <div className="home-avatar-preview">
                     <div className="avatar-preview" style={{ background: avatarColor }}>
                        <span>{avatarIcon}</span>
                     </div>
                     <div className="avatar-preview-label">AVATAR</div>
                  </div>
               </div>
               <div className="avatar-picker">
                  <div className="avatar-section">
                     <div className="avatar-label">AVATAR RANGI</div>
                     <div className="avatar-swatches">
                        {avatarColors.map(color => (
                           <button
                              key={color}
                              type="button"
                              className={`avatar-swatch ${avatarColor === color ? 'selected' : ''}`}
                              style={{ background: color }}
                              onClick={() => setAvatarColor(color)}
                              aria-label={`Avatar color ${color}`}
                           />
                        ))}
                     </div>
                  </div>
                  <div className="avatar-section">
                     <div className="avatar-label">AVATAR IKKONASI</div>
                     <div className="avatar-icons">
                        {avatarIcons.map(icon => (
                           <button
                              key={icon}
                              type="button"
                              className={`avatar-icon ${avatarIcon === icon ? 'selected' : ''}`}
                              onClick={() => setAvatarIcon(icon)}
                              aria-label={`Avatar icon ${icon}`}
                           >
                              {icon}
                           </button>
                        ))}
                     </div>
                  </div>
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
                  {roomIdNotice && <div className="form-notice">{roomIdNotice}</div>}
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
