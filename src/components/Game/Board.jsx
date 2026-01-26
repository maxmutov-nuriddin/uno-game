import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import Hand from './Hand';
import Card from './Card';
import { motion, AnimatePresence } from 'framer-motion';

const Board = ({ gameState, myHand, myId, winner, gameSummary, onExit }) => {
   const socket = useSocket();
   const {
      roomId,
      players,
      activeCard,
      previousActiveCard,
      currentColor,
      direction,
      turnPlayerId,
      autoDrawEnabled,
      pendingDrawCount,
      pendingDrawPlayerId,
      pendingUnoIds,
      justDrewPlayablePlayerId,
      lastActionId,
      lastActionType,
      turnDeadline,
      lastPlayEvent,
      lastPlayId,
      highlightEvent,
      highlightEventId,
   } = gameState;

   const [modalOpen, setModalOpen] = useState(false);
   const [pendingCardIds, setPendingCardIds] = useState([]);
   const [selectedIds, setSelectedIds] = useState([]);
   const [unoFlashIds, setUnoFlashIds] = useState(new Set());
   const [isCoarsePointer, setIsCoarsePointer] = useState(false);
   const [turnNotice, setTurnNotice] = useState('');
   const [reactions, setReactions] = useState(new Map());
   const [mobileEvents, setMobileEvents] = useState([]);
   const [rulesOpen, setRulesOpen] = useState(false);
   const [sentReaction, setSentReaction] = useState('');
   const [reactionOpen, setReactionOpen] = useState(false);
   const [turnRemaining, setTurnRemaining] = useState(0);
   const [momentReplay, setMomentReplay] = useState(null);
   const [highlightNotice, setHighlightNotice] = useState('');
   const [flyBanners, setFlyBanners] = useState([]);

   const isMyTurn = turnPlayerId === myId;
   const showPassAfterDraw = !!myId && justDrewPlayablePlayerId === myId;
   const showUnoButton = !!myId && pendingUnoIds?.includes(myId);
   const hasUnoPending = (playerId) => unoFlashIds.has(playerId);
   const lastAutoDrawTurn = useRef(null);
   const unoTimers = useRef(new Map());
   const turnNoticeTimer = useRef(null);
   const reactionTimers = useRef(new Map());
   const sentReactionTimer = useRef(null);
   const lastNoticeActionId = useRef(0);
   const mobileEventTimers = useRef(new Map());
   const reactionPanelRef = useRef(null);
   const highlightTimer = useRef(null);
   const replayTimer = useRef(null);
   const flyTimers = useRef(new Map());
   const lastWinnerRef = useRef(null);
   const opponents = players.filter(p => p.id !== myId);
   const mePlayer = players.find(p => p.id === myId);
   const splitIndex = Math.ceil(opponents.length / 2);
   const leftOpponents = opponents.slice(0, splitIndex);
   const rightOpponents = opponents.slice(splitIndex);
   const reactionEmojis = ['\ud83d\udd25', '\ud83d\ude02', '\ud83d\ude0e'];

   const pushFlyBanner = (textLabel) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const entry = { id, text: textLabel };
      setFlyBanners(prev => [...prev, entry].slice(-3));
      if (flyTimers.current.has(id)) {
         clearTimeout(flyTimers.current.get(id));
      }
      const timerId = setTimeout(() => {
         setFlyBanners(prev => prev.filter(item => item.id != id));
         flyTimers.current.delete(id);
      }, 2200);
      flyTimers.current.set(id, timerId);
   };

   const formatDuration = (seconds = 0) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
   };

      const clearSelection = () => setSelectedIds([]);

   const onPlaySelected = () => {
      if (!isMyTurn || selectedIds.length === 0) return;
      const selectedCard = myHand.find(card => card.id === selectedIds[0]);
      if (!selectedCard) return;

      if (selectedCard.type === 'plus4') {
         setPendingCardIds([selectedCard.id]);
         setModalOpen(true);
         return;
      }

      socket.emit('game:play', { cardId: selectedCard.id, chosenColor: null });
      clearSelection();
   };

   const onCardClick = (card) => {
      if (!isMyTurn) return;
      if (!card) return;

      if (card.type === 'wild') {
         clearSelection();
         setPendingCardIds([card.id]);
         setModalOpen(true);
         return;
      }

      if (selectedIds.length === 0) {
         if (!canPlayCard(card)) return;
         setSelectedIds([card.id]);
         return;
      }

      if (selectedIds.includes(card.id)) {
         setSelectedIds([]);
         return;
      }

      if (!canPlayCard(card)) return;
      setSelectedIds([card.id]);
   };

   const canPlayCard = (card) => {
      if (!isMyTurn) return false;
      if (!activeCard) return true;
      if (pendingDrawCount > 0 && pendingDrawPlayerId === myId) {
         if (card.type === 'plus4') return true;
         if (card.type !== 'plus2') return false;
         if (activeCard?.type === 'plus2') return true;
         return card.color === currentColor;
      }
      if (card.type === 'wild' || card.type === 'plus4') return true;
      if (card.color === currentColor) return true;
      if (card.type === activeCard.type) {
         if (card.type === 'number') {
            return card.value === activeCard.value;
         }
         return true;
      }
      return false;
   };

   useEffect(() => {
      if (typeof window === 'undefined') return;
      const media = window.matchMedia('(pointer: coarse)');
      const update = () => setIsCoarsePointer(media.matches);
      update();
      if (media.addEventListener) {
         media.addEventListener('change', update);
         return () => media.removeEventListener('change', update);
      }
      media.addListener(update);
      return () => media.removeListener(update);
   }, []);

   useEffect(() => {
      if (!socket) return;
      if (!autoDrawEnabled || !isMyTurn) return;
      if (pendingDrawCount > 0 && pendingDrawPlayerId === myId) return;

      const hasPlayable = myHand.some(canPlayCard);
      if (!hasPlayable && lastAutoDrawTurn.current !== turnPlayerId) {
         lastAutoDrawTurn.current = turnPlayerId;
         socket.emit('game:draw');
      }
   }, [
      socket,
      autoDrawEnabled,
      isMyTurn,
      pendingDrawCount,
      pendingDrawPlayerId,
      myHand,
      activeCard,
      currentColor,
      turnPlayerId,
      myId,
   ]);

   useEffect(() => {
      if (!isMyTurn) {
         clearSelection();
      }
   }, [isMyTurn]);

   useEffect(() => {
      setSelectedIds(prev => prev.filter(id => myHand.some(card => card.id === id)));
   }, [myHand]);

   useEffect(() => {
      if (!turnDeadline) {
         setTurnRemaining(0);
         return;
      }
      const tick = () => {
         const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
         setTurnRemaining(remaining);
      };
      tick();
      const timer = setInterval(tick, 250);
      return () => clearInterval(timer);
   }, [turnDeadline]);

   const pushMobileEvent = (entry) => {
      setMobileEvents(prev => {
         const next = [...prev, entry];
         return next.slice(-2);
      });

      if (mobileEventTimers.current.has(entry.id)) {
         clearTimeout(mobileEventTimers.current.get(entry.id));
      }
      const timerId = setTimeout(() => {
         setMobileEvents(prev => prev.filter(item => item.id !== entry.id));
         mobileEventTimers.current.delete(entry.id);
      }, 3000);
      mobileEventTimers.current.set(entry.id, timerId);
   };

   useEffect(() => {
      return () => {
         mobileEventTimers.current.forEach(id => clearTimeout(id));
         mobileEventTimers.current.clear();
         flyTimers.current.forEach(id => clearTimeout(id));
         flyTimers.current.clear();
      };
   }, []);

   useEffect(() => {
      if (!reactionOpen) return;
      const onDocClick = (event) => {
         if (!reactionPanelRef.current) return;
         if (!reactionPanelRef.current.contains(event.target)) {
            setReactionOpen(false);
         }
      };
      document.addEventListener('click', onDocClick);
      return () => document.removeEventListener('click', onDocClick);
   }, [reactionOpen]);

   useEffect(() => {
      if (!socket) return;

      const onUnoCalled = ({ playerId }) => {
         pushFlyBanner('UNO!');
         setUnoFlashIds(prev => {
            const next = new Set(prev);
            next.add(playerId);
            return next;
         });

         pushMobileEvent({ id: `${playerId}-uno-${Date.now()}`, type: 'uno', playerId });

         if (unoTimers.current.has(playerId)) {
            clearTimeout(unoTimers.current.get(playerId));
         }
         const timerId = setTimeout(() => {
            setUnoFlashIds(prev => {
               const next = new Set(prev);
               next.delete(playerId);
               return next;
            });
            unoTimers.current.delete(playerId);
         }, 2000);
         unoTimers.current.set(playerId, timerId);
      };

      socket.on('uno:called', onUnoCalled);
      return () => {
         socket.off('uno:called', onUnoCalled);
         unoTimers.current.forEach(id => clearTimeout(id));
         unoTimers.current.clear();
      };
   }, [socket]);

   useEffect(() => {
      if (!socket) return;
      const onReactionShow = ({ playerId, emoji }) => {
         if (!playerId || !emoji) return;
         setReactions(prev => {
            const next = new Map(prev);
            next.set(playerId, emoji);
            return next;
         });

         pushMobileEvent({ id: `${playerId}-reaction-${Date.now()}`, type: 'reaction', playerId, emoji });

         if (reactionTimers.current.has(playerId)) {
            clearTimeout(reactionTimers.current.get(playerId));
         }
         const timerId = setTimeout(() => {
            setReactions(prev => {
               const next = new Map(prev);
               next.delete(playerId);
               return next;
            });
            reactionTimers.current.delete(playerId);
         }, 2000);
         reactionTimers.current.set(playerId, timerId);
      };

      socket.on('reaction:show', onReactionShow);
      return () => {
         socket.off('reaction:show', onReactionShow);
         reactionTimers.current.forEach(id => clearTimeout(id));
         reactionTimers.current.clear();
      };
   }, [socket]);

   useEffect(() => {
      if (!lastActionId || lastActionId === lastNoticeActionId.current) return;
      if (lastActionType !== 'play' && lastActionType !== 'pass') return;
      if (!turnPlayerId) return;
      const player = players.find(p => p.id === turnPlayerId);
      if (!player) return;

      lastNoticeActionId.current = lastActionId;
      setTurnNotice(player.name);
      if (turnNoticeTimer.current) {
         clearTimeout(turnNoticeTimer.current);
      }
      turnNoticeTimer.current = setTimeout(() => {
         setTurnNotice('');
         turnNoticeTimer.current = null;
      }, 1500);

      return () => {
         if (turnNoticeTimer.current) {
            clearTimeout(turnNoticeTimer.current);
            turnNoticeTimer.current = null;
         }
      };
   }, [lastActionId, lastActionType, turnPlayerId, players]);

   useEffect(() => {
      if (!turnPlayerId) return;
      const player = players.find(p => p.id === turnPlayerId);
      if (!player) return;
      if (player.isOnline) return;
      pushMobileEvent({
         id: `${player.id}-offline-${Date.now()}`,
         type: 'status',
         playerId: player.id,
         message: "o'yinchi offlayn"
      });
   }, [turnPlayerId, players]);

   useEffect(() => {
      if (!highlightEventId || !highlightEvent) return;
      const player = players.find(p => p.id === highlightEvent.playerId);
      if (!player) return;
      const message = highlightEvent.type === 'streak'
         ? `Olov: ${player.name}`
         : `Comeback: ${player.name}`;
      setHighlightNotice(message);
      pushMobileEvent({
         id: `highlight-${highlightEventId}-${Date.now()}`,
         type: 'highlight',
         playerId: highlightEvent.playerId,
         message
      });
      if (highlightTimer.current) {
         clearTimeout(highlightTimer.current);
      }
      highlightTimer.current = setTimeout(() => {
         setHighlightNotice('');
         highlightTimer.current = null;
      }, 1800);
   }, [highlightEventId, highlightEvent, players]);

   useEffect(() => {
      if (!lastPlayId || !lastPlayEvent) return;
      setMomentReplay(lastPlayEvent);
      if (replayTimer.current) {
         clearTimeout(replayTimer.current);
      }
      replayTimer.current = setTimeout(() => {
         setMomentReplay(null);
         replayTimer.current = null;
      }, 1500);
   }, [lastPlayId, lastPlayEvent]);

   const renderPlayerTile = (player, slotClass, options = {}) => {
      if (!player) return null;
      const isActive = player.id === turnPlayerId;
      const isMe = options.isMe;
      const cardCount = isMe ? myHand.length : player.cardCount;
      useEffect(() => {
      if (!winner || lastWinnerRef.current == winner) return;
      lastWinnerRef.current = winner;
      pushFlyBanner(`G'OLIB!`);
   }, [winner]);

   return (
         <div className={`${slotClass} player-tile ${isActive ? 'active' : ''} ${options.compact ? 'compact' : ''} ${isMe ? 'me' : ''} ${cardCount === 1 ? 'hot-seat' : ''}`}>
            <div className="glass-chip">
               <div className="avatar-initials" style={{ background: player.avatarColor || 'rgba(0, 0, 0, 0.4)' }}>
                  {player.avatarIcon === 'uno' ? (
                     <img className="avatar-icon-img" src="/unocards/uno-icon.png" alt="UNO" />
                  ) : (
                     player.avatarIcon || player.name[0].toUpperCase()
                  )}
                  <div className={`online-indicator ${player.isOnline && !player.isAway ? '' : 'offline'}`} />
               </div>

               <div className="tile-meta">
                  <div className="opp-name">{player.name}</div>
                  <div className="opp-cards">
                     {Array.from({ length: Math.min(cardCount, 8) }).map((_, index) => (
                        <div
                           key={index}
                           className="opp-card"
                           style={{
                              zIndex: index,
                              transform: `translateX(${index * 6}px)`
                           }}
                        />
                     ))}
                     {cardCount > 8 && (
                        <span style={{
                           fontSize: '0.65rem',
                           opacity: 0.8,
                           color: '#fff',
                           marginLeft: (8 * 6) + 8 + 'px',
                           fontWeight: 700,
                           lineHeight: '14px'
                        }}>
                           +{cardCount - 8}
                        </span>
                     )}
                  </div>
               </div>

               {hasUnoPending(player.id) && (
                  <div className="uno-badge">UNO</div>
               )}

               {reactions.has(player.id) && (
                  <div className="reaction-pop">{reactions.get(player.id)}</div>
               )}
            </div>
            {momentReplay && momentReplay.playerId === player.id && (
               <div className="moment-replay">
                  <div className="moment-card">
                     <Card card={momentReplay.card} size="small" />
                  </div>
               </div>
            )}
         </div>
      );
   };

   const renderMobileEvent = (entry) => {
      const player = players.find(p => p.id === entry.playerId);
      if (!player) return null;
      return (
         <div key={entry.id} className="mobile-event-item">
            <div className="mobile-event-avatar" style={{ background: player.avatarColor || 'rgba(0, 0, 0, 0.4)' }}>
               {player.avatarIcon === 'uno' ? (
                  <img className="avatar-icon-img" src="/unocards/uno-icon.png" alt="UNO" />
               ) : (
                  player.avatarIcon || player.name[0].toUpperCase()
               )}
            </div>
            <div className="mobile-event-text">
               <span className="mobile-event-name">{player.name}</span>
               <span className="mobile-event-message">
                  {entry.type === 'uno'
                     ? 'UNO!'
                     : entry.type === 'reaction'
                        ? entry.emoji
                        : entry.message}
               </span>
            </div>
         </div>
      );
   };

   return (
      <div className="game-table" style={{ '--theme-color': currentColor ? `var(--c-${currentColor})` : 'rgba(255,255,255,0.12)' }}>
         {turnNotice && (
            <div className="turn-toast turn-toast-right">
               Navbat: {turnNotice}
            </div>
         )}
         {highlightNotice && (
            <div className="turn-toast highlight-toast">
               {highlightNotice}
            </div>
         )}
         {flyBanners.length > 0 && (
            <div className="fly-banner-layer">
               {flyBanners.map(item => (
                  <div key={item.id} className={item.text === 'UNO!' ? 'fly-banner uno' : 'fly-banner'}>
                     {item.text}
                  </div>
               ))}
            </div>
         )}
         {/* Side Seating */}
         <div className="opponents-side left">
            {leftOpponents.map(player => (
               <div key={player.id} className="side-slot">
                  {renderPlayerTile(player, '', { compact: true })}
               </div>
            ))}
         </div>
         <div className="opponents-side right">
            {rightOpponents.map(player => (
               <div key={player.id} className="side-slot">
                  {renderPlayerTile(player, '', { compact: true })}
               </div>
            ))}
         </div>
         {renderPlayerTile(mePlayer, 'seat-bottom-left', { isMe: true })}

         {/* Mobile strip fallback (if screened) */}
         <div className={`opponents-mobile-strip ${opponents.length > 3 ? 'dense' : ''} ${opponents.length > 6 ? 'dense-more' : ''}`}>
            {opponents.map(player => (
               <div key={player.id} className="mobile-opp">
                  {renderPlayerTile(player, '', { compact: true })}
               </div>
            ))}
         </div>
         {mobileEvents.length > 0 && (
            <div className="mobile-event-feed">
               {mobileEvents.map(renderMobileEvent)}
            </div>
         )}

         {/* 🟢 Center Focal Point */}
         <div className={`table-center ${pendingDrawCount > 0 ? 'table-mood-alert' : ''}`}>
            <div className="center-glow" style={{ background: currentColor || 'rgba(255,255,255,0.1)' }}></div>

            <div className="direction-ring">
               <motion.div
                  animate={isCoarsePointer ? { rotate: 0 } : { rotate: direction === 1 ? 360 : -360 }}
                  transition={isCoarsePointer ? { duration: 0 } : { repeat: Infinity, duration: 20, ease: "linear" }}
               >
                  {direction === 1 ? '↺' : '↻'}
               </motion.div>
            </div>

            <motion.div
               className="deck-pill"
               whileHover={isCoarsePointer ? {} : { scale: 1.05 }}
               onClick={() => {
                  if (!isMyTurn) return;
                  if (pendingDrawCount > 0 && pendingDrawPlayerId === myId) {
                     socket.emit('game:draw');
                     return;
                  }
                  socket.emit('game:draw');
               }}
            >
               <Card card={null} size="small" />
               <div style={{ textAlign: 'center', fontSize: '0.7rem', marginTop: '5px', opacity: 0.6 }}>KARTA OLISH</div>
            </motion.div>

            <div className="active-card-box" style={{ position: 'relative' }}>
               {/* Previous Card - purely visual history */}
               {previousActiveCard && (
                  <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0.5, transform: 'rotate(-45deg) scale(0.9)', zIndex: 0 }}>
                     <Card card={previousActiveCard} size="large" />
                  </div>
               )}

               {/* Draw Counter Badge */}
               {pendingDrawCount > 0 && (
                  <motion.div
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     style={{
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        background: '#ff1744',
                        color: 'white',
                        fontWeight: '900',
                        fontSize: '1.2rem',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        zIndex: 50,
                        border: '2px solid white'
                     }}
                  >
                     +{pendingDrawCount}
                  </motion.div>
               )}

               <AnimatePresence mode='wait'>
                  <motion.div
                     key={activeCard?.id || 'empty'}
                     initial={{ scale: 0.5, opacity: 0, rotate: -20, y: -50 }}
                     animate={{ scale: 1.1, opacity: 1, rotate: 0, y: 0, zIndex: 10 }}
                     exit={{ scale: 0.5, opacity: 0, x: -100 }}
                     transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                     <Card card={activeCard} size="large" />
                  </motion.div>
               </AnimatePresence>
            </div>
         </div>

         {/* UI Actions */}
         <div className="table-controls">
            <button className="btn-pill btn-secondary" onClick={onExit}>
               CHIQISH
            </button>
            <button className="btn-pill btn-secondary" onClick={() => setRulesOpen(true)}>
               QOIDALAR
            </button>
            <div className="reaction-bar" ref={reactionPanelRef}>
               {sentReaction && <div className="reaction-sent">Yuborildi {sentReaction}</div>}
               <button
                  className="reaction-btn reaction-trigger"
                  onClick={(event) => {
                     event.stopPropagation();
                     setReactionOpen(prev => !prev);
                  }}
                  aria-label="Stickerlar"
               >
                  {'\ud83d\ude42'}
               </button>
               {reactionOpen && (
                  <div className="reaction-panel" onClick={event => event.stopPropagation()}>
                     {reactionEmojis.map(emoji => (
                        <button
                           key={emoji}
                           className="reaction-btn"
                           onClick={() => {
                              socket.emit('reaction:send', { emoji });
                              setSentReaction(emoji);
                              setReactionOpen(false);
                              if (sentReactionTimer.current) {
                                 clearTimeout(sentReactionTimer.current);
                              }
                              sentReactionTimer.current = setTimeout(() => {
                                 setSentReaction('');
                                 sentReactionTimer.current = null;
                              }, 1200);
                           }}
                           aria-label={`Reaction ${emoji}`}
                        >
                           {emoji}
                        </button>
                     ))}
                  </div>
               )}
            </div>
         </div>
         {turnRemaining > 0 && (
            <div className="turn-timer">
               {turnRemaining}s
            </div>
         )}

         {/* HAND - Player 1 */}
         {myId && (
         <div className="seat-bottom">
            <div className="hand-area">
               <Hand
                  hand={myHand}
                  onCardClick={onCardClick}
                  selectedIds={selectedIds}
                  isMyTurn={isMyTurn}
                  activeCard={activeCard}
                  currentColor={currentColor}
                  pendingDrawCount={pendingDrawCount}
                  pendingDrawPlayerId={pendingDrawPlayerId}
                  myId={myId}
               />
            </div>
            {(isMyTurn && selectedIds.length > 0) || showUnoButton || showPassAfterDraw ? (
               <div className="hand-actions">
                  {isMyTurn && selectedIds.length > 0 && (
                     <>
                        <button className="btn-pill btn-primary" onClick={onPlaySelected}>
                           QOʻYISH
                        </button>
                        <button className="btn-pill btn-secondary" onClick={clearSelection}>
                           TOZALASH
                        </button>
                     </>
                  )}
                  {showPassAfterDraw && (
                     <button className="btn-pill btn-secondary" onClick={() => socket.emit('game:pass')}>
                        OʻTKAZISH
                     </button>
                  )}
                  {showUnoButton && (
                     <button className="btn-pill uno-call-btn" onClick={() => socket.emit('game:uno')}>
                        UNO!
                     </button>
                  )}
               </div>
            ) : null}
         </div>
         )}

         {/* Color Picker & Winner Modals are same as before, but with better glass styling */}
         <AnimatePresence>
            {modalOpen && (
               <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="premium-box">
                     <h3 style={{ marginBottom: '25px' }}>RANGNI TANLANG</h3>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {['red', 'blue', 'green', 'yellow'].map(c => (
                           <button
                              key={c}
                              onClick={() => {
                                 if (pendingCardIds.length > 1) {
                                    socket.emit('game:play', { cardIds: pendingCardIds, chosenColor: c });
                                 } else {
                                    socket.emit('game:play', { cardId: pendingCardIds[0], chosenColor: c });
                                 }
                                 clearSelection();
                                 setPendingCardIds([]);
                                 setModalOpen(false);
                              }}
                              style={{ width: '80px', height: '80px', borderRadius: '50%', border: 'none', background: `var(--c-${c})`, boxShadow: `0 0 20px var(--c-${c})`, cursor: 'pointer' }}
                           />
                        ))}
                     </div>
                     <button
                        style={{ marginTop: '24px', width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        onClick={() => {
                           setModalOpen(false);
                           setPendingCardIds([]);
                        }}
                     >
                        BEKOR QILISH
                     </button>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         <AnimatePresence>
            {rulesOpen && (
               <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="premium-box rules-box">
                     <h3 style={{ marginBottom: '20px' }}>QOIDALAR</h3>
                     <ul className="rules-list">
                        <li>Navbat kelgan o‘yinchi bitta karta tashlaydi.</li>
                        <li>Mos karta bo‘lmasa bitta karta oladi.</li>
                        <li>+2 yoki +4 tushsa, navbatdagi o‘yinchi +2/+4 qo‘yishi mumkin.</li>
                        <li>Wild va +4 rang tanlaydi.</li>
                        <li>1 karta qolganda UNO tugmasini bosing.</li>
                     </ul>
                     <button
                        className="btn-glass btn-secondary"
                        onClick={() => setRulesOpen(false)}
                     >
                        YOPISH
                     </button>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         <AnimatePresence>
            {winner && (
               <motion.div className="modal-overlay endgame-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="endgame-celebration">
                     <div className="endgame-glow" aria-hidden="true"></div>
                     <div className="endgame-sparkles" aria-hidden="true">
                        <span className="spark spark-1"></span>
                        <span className="spark spark-2"></span>
                        <span className="spark spark-3"></span>
                        <span className="spark spark-4"></span>
                        <span className="spark spark-5"></span>
                        <span className="spark spark-6"></span>
                     </div>
                     <div className="endgame-confetti" aria-hidden="true">
                        <span className="confetti c1"></span>
                        <span className="confetti c2"></span>
                        <span className="confetti c3"></span>
                        <span className="confetti c4"></span>
                        <span className="confetti c5"></span>
                        <span className="confetti c6"></span>
                        <span className="confetti c7"></span>
                        <span className="confetti c8"></span>
                     </div>
                     <div className="premium-box endgame-card">
                        <div className="endgame-trophy">KUBOK</div>
                        <h2 style={{ fontSize: '2.2rem', marginBottom: '20px', fontWeight: 800 }}>{winner} G'OLIB!</h2>
                        {gameSummary && (
                           <div className="results-grid">
                              {gameSummary.mvpName && (
                                 <div className="results-item results-full">
                                    <span>MVP</span>
                                    <strong>{gameSummary.mvpName}</strong>
                                    <div className="results-list">
                                       <div className="results-row">
                                          <span>{gameSummary.mvpReason}</span>
                                       </div>
                                    </div>
                                 </div>
                              )}
                              <div className="results-item">
                                 <span>O'yin davomiyligi</span>
                                 <strong>{formatDuration(gameSummary.durationSeconds)}</strong>
                              </div>
                              <div className="results-item">
                                 <span>Umumiy yurishlar</span>
                                 <strong>{gameSummary.totalMoves}</strong>
                              </div>
                              <div className="results-item results-full">
                                 <span>Eng ko'p karta olgan</span>
                                 <strong>
                                    {gameSummary.mostDrawnPlayers?.length
                                       ? `${gameSummary.mostDrawnPlayers.join(', ')} (${gameSummary.mostDrawnCount})`
                                       : '-'}
                                 </strong>
                              </div>
                              <div className="results-item results-full">
                                 <span>Yakuniy kartalar</span>
                                 <div className="results-list">
                                    {gameSummary.players?.map(player => (
                                       <div key={player.id} className="results-row">
                                          <span>{player.name}</span>
                                          <span>{player.cardCount} ta</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        )}
                        <button className="btn-glass btn-primary" onClick={onExit}>CHIQISH</button>
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
};

export default Board;

