import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import Hand from './Hand';
import Card from './Card';
import { motion, AnimatePresence } from 'framer-motion';

const Board = ({ gameState, myHand, myId, winner, onExit }) => {
   const socket = useSocket();
   const {
      roomId,
      players,
      activeCard,
      currentColor,
      direction,
      turnPlayerId,
      autoDrawEnabled,
      pendingDrawCount,
      pendingDrawPlayerId,
      pendingUnoIds,
      justDrewPlayablePlayerId,
   } = gameState;

   const [modalOpen, setModalOpen] = useState(false);
   const [pendingCardId, setPendingCardId] = useState(null);
   const [selectedIds, setSelectedIds] = useState([]);
   const [unoFlashIds, setUnoFlashIds] = useState(new Set());

   const isMyTurn = turnPlayerId === myId;
   const showPassAfterDraw = justDrewPlayablePlayerId === myId;
   const showUnoButton = pendingUnoIds?.includes(myId);
   const hasUnoPending = (playerId) => unoFlashIds.has(playerId);
   const lastAutoDrawTurn = useRef(null);
   const unoTimers = useRef(new Map());
   const opponents = players.filter(p => p.id !== myId);
   const mePlayer = players.find(p => p.id === myId);

   const cornerSlots = [
      { slotClass: 'seat-top-left', player: opponents[0] },
      { slotClass: 'seat-top-right', player: opponents[1] },
      { slotClass: 'seat-bottom-right', player: opponents[2] },
   ];

   const clearSelection = () => setSelectedIds([]);

   const onPlaySelected = () => {
      if (!isMyTurn || selectedIds.length === 0) return;
      if (selectedIds.length === 1) {
         socket.emit('game:play', { cardId: selectedIds[0], chosenColor: null });
      } else {
         socket.emit('game:play', { cardIds: selectedIds });
      }
      clearSelection();
   };

   const onCardClick = (card) => {
      if (!isMyTurn) return;
      if (!card) return;

      if (card.type === 'wild' || card.type === 'plus4') {
         clearSelection();
         setPendingCardId(card.id);
         setModalOpen(true);
         return;
      }

      if (card.type !== 'number') {
         clearSelection();
         if (canPlayCard(card)) {
            socket.emit('game:play', { cardId: card.id, chosenColor: null });
         }
         return;
      }

      if (selectedIds.length === 0) {
         if (!canPlayCard(card)) return;
         setSelectedIds([card.id]);
         return;
      }

      if (selectedIds.includes(card.id)) {
         setSelectedIds(prev => prev.filter(id => id !== card.id));
         return;
      }

      const first = myHand.find(c => c.id === selectedIds[0]);
      if (!first || first.type !== 'number') {
         clearSelection();
         return;
      }
      if (card.value !== first.value) return;

      setSelectedIds(prev => [...prev, card.id]);
   };

   const canPlayCard = (card) => {
      if (!isMyTurn) return false;
      if (!activeCard) return true;
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
      if (!socket) return;

      const onUnoCalled = ({ playerId }) => {
         setUnoFlashIds(prev => {
            const next = new Set(prev);
            next.add(playerId);
            return next;
         });

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

   const renderPlayerTile = (player, slotClass, options = {}) => {
      if (!player) return null;
      const isActive = player.id === turnPlayerId;
      const isMe = options.isMe;
      const cardCount = isMe ? myHand.length : player.cardCount;
      return (
         <div className={`${slotClass} player-tile ${isActive ? 'active' : ''} ${options.compact ? 'compact' : ''} ${isMe ? 'me' : ''}`}>
            <div className="glass-chip">
               <div className="avatar-initials">
                  {player.name[0].toUpperCase()}
                  <div className={`online-indicator ${player.isOnline ? '' : 'offline'}`} />
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
            </div>
         </div>
      );
   };

   return (
      <div className="game-table">
         {/* Corner Seating */}
         {cornerSlots.map(({ slotClass, player }) => renderPlayerTile(player, slotClass))}
         {renderPlayerTile(mePlayer, 'seat-bottom-left', { isMe: true })}

         {/* Mobile strip fallback (if screened) */}
         <div className="opponents-mobile-strip">
            {opponents.map(player => (
               <div key={player.id} className="mobile-opp">
                  {renderPlayerTile(player, '', { compact: true })}
               </div>
            ))}
         </div>

         {/* 🟢 Center Focal Point */}
         <div className="table-center">
            <div className="center-glow" style={{ background: currentColor || 'rgba(255,255,255,0.1)' }}></div>

            <div className="direction-ring">
               <motion.div
                  animate={{ rotate: direction === 1 ? 360 : -360 }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
               >
                  {direction === 1 ? '↺' : '↻'}
               </motion.div>
            </div>

            <motion.div
               className="deck-pill"
               whileHover={{ scale: 1.05 }}
               onClick={() => {
                  if (!isMyTurn) return;
                  if (pendingDrawCount > 0 && pendingDrawPlayerId === myId) {
                     for (let i = 0; i < pendingDrawCount; i += 1) {
                        socket.emit('game:draw');
                     }
                     return;
                  }
                  socket.emit('game:draw');
               }}
            >
               <Card card={null} size="small" />
               <div style={{ textAlign: 'center', fontSize: '0.7rem', marginTop: '5px', opacity: 0.6 }}>DRAW</div>
            </motion.div>

            <div className="active-card-box">
               <AnimatePresence mode='wait'>
                  <motion.div
                     key={activeCard?.id || 'empty'}
                     initial={{ scale: 0.5, opacity: 0, rotate: -20, y: -50 }}
                     animate={{ scale: 1.1, opacity: 1, rotate: 0, y: 0 }}
                     exit={{ scale: 0.5, opacity: 0, x: -100 }}
                     transition={{ type: 'spring', damping: 12 }}
                  >
                     <Card card={activeCard} size="large" />
                  </motion.div>
               </AnimatePresence>
            </div>
         </div>

         {/* UI Actions */}
         <div className="table-controls">
            <button className="btn-pill btn-secondary" onClick={onExit}>
               EXIT
            </button>
            {showPassAfterDraw && (
               <button className="btn-pill btn-secondary" onClick={() => socket.emit('game:pass')}>
                  PASS
               </button>
            )}
            {showUnoButton && (
               <button className="btn-pill uno-call-btn" onClick={() => socket.emit('game:uno')}>
                  UNO!
               </button>
            )}
         </div>

         {/* HAND - Player 1 */}
         <div className="seat-bottom">
            <div className="hand-area">
               <Hand
                  hand={myHand}
                  onCardClick={onCardClick}
                  selectedIds={selectedIds}
                  isMyTurn={isMyTurn}
                  activeCard={activeCard}
                  currentColor={currentColor}
               />
            </div>
            {isMyTurn && selectedIds.length > 0 && (
               <div className="hand-actions">
                  <button className="btn-pill btn-primary" onClick={onPlaySelected}>
                     PLAY {selectedIds.length}
                  </button>
                  <button className="btn-pill btn-secondary" onClick={clearSelection}>
                     CLEAR
                  </button>
               </div>
            )}
         </div>

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
                                 socket.emit('game:play', { cardId: pendingCardId, chosenColor: c });
                                 setModalOpen(false);
                              }}
                              style={{ width: '80px', height: '80px', borderRadius: '50%', border: 'none', background: `var(--c-${c})`, boxShadow: `0 0 20px var(--c-${c})`, cursor: 'pointer' }}
                           />
                        ))}
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         <AnimatePresence>
            {winner && (
               <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(30px)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="premium-box" style={{ padding: '64px', textAlign: 'center' }}>
                     <h1 style={{ fontSize: '4rem', marginBottom: '16px' }}>🏆</h1>
                     <h2 style={{ fontSize: '2.5rem', marginBottom: '32px', fontWeight: 800 }}>{winner} G‘OLIB!</h2>
                     <button className="btn-glass btn-primary" onClick={onExit}>EXIT</button>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
};

export default Board;
