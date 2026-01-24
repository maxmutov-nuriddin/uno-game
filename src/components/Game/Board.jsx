import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import Hand from './Hand';
import Card from './Card';
import { motion } from 'framer-motion';

const Board = ({ gameState, myHand, myId }) => {
   const socket = useSocket();
   const {
      roomId,
      players,
      activeCard,
      currentColor,
      direction,
      turnPlayerId,
      status
   } = gameState;

   const [modalOpen, setModalOpen] = useState(false);
   const [pendingCardId, setPendingCardId] = useState(null);

   const isMyTurn = turnPlayerId === myId;
   const activePlayer = players.find(p => p.id === turnPlayerId);

   const onPlay = (cardId) => {
      if (!isMyTurn) return;
      const card = myHand.find(c => c.id === cardId);

      if (card.type === 'wild' || card.type === 'plus4') {
         setPendingCardId(cardId);
         setModalOpen(true);
      } else {
         socket.emit('game:play', { cardId, chosenColor: null });
      }
   };

   const handleColorSelect = (color) => {
      socket.emit('game:play', { cardId: pendingCardId, chosenColor: color });
      setModalOpen(false);
      setPendingCardId(null);
   };

   const handleDraw = () => {
      if (!isMyTurn) return;
      socket.emit('game:draw');
   };

   const handlePass = () => {
      if (!isMyTurn) return;
      socket.emit('game:pass');
   };

   // Calculate position for opponents (simplified circular or top row)
   const opponents = players.filter(p => p.id !== myId);

   return (
      <div className="game-board-layout">
         {/* Header Info */}
         <div className="game-header">
            <div className="room-badge">ID: {roomId}</div>
            <div className="turn-badge">
               {isMyTurn ? "Sizning navbatingiz!" : `${activePlayer?.name} o‘ylamoqda...`}
            </div>
            <div className="direction-badge">
               {direction === 1 ? '⟳' : '⟲'}
            </div>
         </div>

         {/* Opponents Area */}
         <div className="opponents-strip">
            {opponents.map(p => (
               <motion.div
                  key={p.id}
                  animate={{
                     scale: p.id === turnPlayerId ? 1.1 : 1,
                     borderColor: p.id === turnPlayerId ? '#ff9800' : 'transparent'
                  }}
                  className={`opponent-avatar ${p.id === turnPlayerId ? 'turn-glow' : ''}`}
               >
                  <div className="avatar-circle">{p.name[0]}</div>
                  <div className="opp-info">
                     <span className="opp-name">{p.name}</span>
                     <span className="opp-cards">🎴 {p.cardCount}</span>
                  </div>
               </motion.div>
            ))}
         </div>

         {/* Center Field */}
         <div className="center-field">
            <div className="deck-pile" onClick={handleDraw}>
               <Card card={null} />
               <span className="label">Olish</span>
            </div>

            <div className="active-pile">
               <motion.div
                  key={activeCard?.id || 'start'}
                  initial={{ opacity: 0, x: 100, rotate: 20 }}
                  animate={{ opacity: 1, x: 0, rotate: 0 }}
               >
                  <Card card={activeCard} />
               </motion.div>
            </div>

            {currentColor && (
               <motion.div
                  className="color-indicator"
                  animate={{ backgroundColor: currentColor }}
                  title="Current Color"
               />
            )}
         </div>

         {/* Controls */}
         <div className="controls-area">
            {isMyTurn && <button className="btn-small" onClick={handlePass}>O‘tkazish</button>}
         </div>

         {/* Player Hand */}
         <div className="my-hand-area">
            <Hand hand={myHand} onPlayCard={onPlay} isMyTurn={isMyTurn} />
         </div>

         {/* Modal for Color */}
         {modalOpen && (
            <div className="modal-overlay">
               <div className="color-modal">
                  <h3>Rangni tanlang</h3>
                  <div className="color-grid">
                     {['red', 'blue', 'green', 'yellow'].map(c => (
                        <button
                           key={c}
                           className={`btn-color ${c}`}
                           onClick={() => handleColorSelect(c)}
                        />
                     ))}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default Board;
