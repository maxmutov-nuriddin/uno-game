import React, { useState, useEffect } from 'react';
import { useSocket, useSocketControls } from '../context/useSocket';
import { NETWORK_MODES } from '../services/onlineSocketResolver';
import { motion } from 'framer-motion';

const Home = () => {
   const socket = useSocket();
   const { setNetworkMode, isResolvingNetwork } = useSocketControls();
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
   const [entryMode, setEntryMode] = useState(null);
   const [nicknameNotice, setNicknameNotice] = useState('');
   const [roomIdNotice, setRoomIdNotice] = useState('');
   const [isJoining, setIsJoining] = useState(false);
   const [isCreating, setIsCreating] = useState(false);
   const [avatarColor, setAvatarColor] = useState(avatarColors[0]);
   const [avatarIcon, setAvatarIcon] = useState(avatarIcons[0]);
   const MotionDiv = motion.div;
   const randomNicknames = [
      'Jonim',
      'Momiqcha',
      'Okenmako',
      'Janob',
      'Hechkim',
      'Qadrdon',
      'Kulgich',
      'Samuray',
      'Soya',
      'Sevinch',
      'Shodlik',
      'Ravshan',
      'Sabo',
      'Tinch',
      'Uzunyo'
   ];
   
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

   const generateRandomName = () => {
      const name = randomNicknames[Math.floor(Math.random() * randomNicknames.length)];
      setNickname(name.slice(0, 15));
   };

   const ensureTransportReady = () => {
      if (isResolvingNetwork) {
         showRoomIdNotice('Ulanish sozlanmoqda, biroz kuting.');
         return false;
      }
      if (!socket) {
         showRoomIdNotice("Serverga ulanib bo'lmadi.");
         return false;
      }
      return true;
   };

   const handleCreate = () => {
      if (isCreating || !ensureTransportReady()) return;
      const selectedNetworkMode = entryMode === 'online' ? NETWORK_MODES.ONLINE : NETWORK_MODES.LAN;
      const requiresNickname = selectedNetworkMode !== NETWORK_MODES.LAN;
      if (requiresNickname && !nickname.trim()) {
         showNicknameNotice("Ismingizni kiriting.");
         return;
      }
      setIsCreating(true);
      setNetworkMode(selectedNetworkMode);
      socket.emit('room:create', {
         nickname: requiresNickname ? nickname : '',
         startCardsCount: startCards,
         autoDrawEnabled,
         avatarColor,
         avatarIcon,
         networkMode: selectedNetworkMode,
         hostSpectator: selectedNetworkMode === NETWORK_MODES.LAN
      });
   };

   const handleJoin = () => {
      if (isJoining || !ensureTransportReady()) return;
      if (!nickname) {
         showNicknameNotice("Ismingizni kiriting.");
         return;
      }
      if (!roomId) {
         showRoomIdNotice("Xona ID kiriting.");
         return;
      }
      setIsJoining(true);
      const selectedNetworkMode = entryMode === 'online' ? NETWORK_MODES.ONLINE : NETWORK_MODES.LAN;
      setNetworkMode(selectedNetworkMode);
      socket.emit('room:join', {
         nickname,
         roomId,
         avatarColor,
         avatarIcon,
         networkMode: selectedNetworkMode
      });
   };

   useEffect(() => {
      if (!socket) return;
      const onError = ({ message }) => {
         setIsJoining(false);
         setIsCreating(false);
         if (mode !== 'join') return;
         if (message === 'Xona topilmadi!') {
            showRoomIdNotice("Bunday xona yo'q.");
         }
      };
      socket.on('error:msg', onError);
      return () => socket.off('error:msg', onError);
   }, [socket, mode]);

   return (
      <MotionDiv
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
                  {entryMode && (
                     <div>
                        <span>{entryMode === 'lan' ? 'LAN' : 'ONLINE'}</span>
                        <small>Tez aloqa</small>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {mode === 'menu' && !entryMode && (
            <div className="menu-buttons home-actions">
               <button
                  className="btn-glass btn-primary"
                  onClick={() => {
                     setNetworkMode(NETWORK_MODES.LAN);
                     setEntryMode('lan');
                  }}
               >
                  LAN
               </button>
               <button
                  className="btn-glass btn-secondary"
                  onClick={() => {
                     setNetworkMode(NETWORK_MODES.ONLINE);
                     setEntryMode('online');
                  }}
               >
                  ONLINE
               </button>
            </div>
         )}

         {mode === 'menu' && entryMode && (
            <div className="menu-buttons home-actions">
               <div className="mode-chip">REJIM: {entryMode === 'lan' ? 'LAN' : 'ONLINE'}</div>
               <button className="btn-glass btn-primary" onClick={() => setMode('create')}>XONA YARATISH</button>
               <button className="btn-glass btn-secondary" onClick={() => setMode('join')}>QO'SHILISH</button>
               <button className="btn-glass btn-secondary" onClick={() => setEntryMode(null)}>REJIMNI O'ZGARTIRISH</button>
            </div>
         )}

         {mode === 'create' && (
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sub-menu">
               {entryMode && (
                  <div className="mode-chip subtle">REJIM: {entryMode === 'lan' ? 'LAN' : 'ONLINE'}</div>
               )}
               <div className="form-header">
                  {entryMode !== 'lan' && (
                     <div className="input-group">
                        <label>NICKNAME</label>
                        <div className="nickname-row">
                           <input
                              type="text"
                              placeholder="Ismingiz..."
                              value={nickname}
                              onChange={e => setNickname(e.target.value.slice(0, 15))}
                              maxLength={15}
                           />
                           <button type="button" className="btn-glass btn-secondary nickname-random" onClick={generateRandomName} aria-label="Random nickname">
                              {'\ud83c\udfb2'}
                           </button>
                        </div>
                        {nicknameNotice && <div className="form-notice">{nicknameNotice}</div>}
                     </div>
                  )}
                  {entryMode !== 'lan' && (
                     <div className="home-avatar-preview">
                        <div className="avatar-preview" style={{ background: avatarColor }}>
                           <span>{avatarIcon}</span>
                        </div>
                        <div className="avatar-preview-label">AVATAR</div>
                     </div>
                  )}
               </div>
               {entryMode !== 'lan' && (
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
               )}
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
               {entryMode === 'lan' && (
                  <div className="form-notice">LAN: yaratuvchi kuzatuvchi bo'ladi (o'ynamaydi).</div>
               )}
               <div className="form-row">
                  <button className="btn-glass btn-primary" onClick={handleCreate} disabled={isCreating}>
                     {isCreating ? 'YARATILMOQDA...' : "O'YINNI BOSHLASH"}
                  </button>
                  <button className="btn-glass btn-secondary" onClick={() => setMode('menu')} disabled={isCreating}>ORTGA</button>
               </div>
            </MotionDiv>
         )}

         {mode === 'join' && (
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sub-menu">
               {entryMode && (
                  <div className="mode-chip subtle">REJIM: {entryMode === 'lan' ? 'LAN' : 'ONLINE'}</div>
               )}
               <div className="form-header">
                  <div className="input-group">
                     <label>NICKNAME</label>
                     <div className="nickname-row">
                        <input
                           type="text"
                           placeholder="Ismingiz..."
                           value={nickname}
                           onChange={e => setNickname(e.target.value.slice(0, 15))}
                           maxLength={15}
                        />
                        <button type="button" className="btn-glass btn-secondary nickname-random" onClick={generateRandomName} aria-label="Random nickname">
                           {'\ud83c\udfb2'}
                        </button>
                     </div>
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
                  <button className="btn-glass btn-primary" onClick={handleJoin} disabled={isJoining}>
                     {isJoining ? 'KIRILMOQDA...' : 'XONAGA KIRISH'}
                  </button>
                  <button className="btn-glass btn-secondary" onClick={() => setMode('menu')} disabled={isJoining}>ORTGA</button>
               </div>
            </MotionDiv>
         )}

      </MotionDiv>
   );
};

export default Home;
