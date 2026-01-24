import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import Hand from './Hand';
import Card from './Card';

const Board = ({ gameState }) => {
   const socket = useSocket();
   const { players, me, activeCard, currentColor, direction, status, roomId } = gameState;
   const [showColorPicker, setShowColorPicker] = useState(false);
   const [pendingCardIndex, setPendingCardIndex] = useState(null);

   const isMyTurn = gameState.players.find(p => p.id === me.id)?.isTurn;
   const activePlayer = players.find(p => p.isTurn);

   const handleDraw = () => {
      if (!isMyTurn) return;
      socket.emit('drawCard');
   };

   const handlePass = () => {
      if (!isMyTurn) return; // Should only show if drawn? Backend allows pass anytime for now
      socket.emit('passTurn');
   };

   const onPlayCard = (index, card) => {
      if (!isMyTurn) return;

      if (card.type === 'wild' || card.type === 'plus4') {
         setPendingCardIndex(index);
         setShowColorPicker(true);
      } else {
         socket.emit('playCard', { cardIndex: index, color: null });
      }
   };

   const handleColorSelect = (color) => {
      socket.emit('playCard', { cardIndex: pendingCardIndex, color });
      setShowColorPicker(false);
      setPendingCardIndex(null);
   };

   // Calculate opponent positions (simplified)
   const opponents = players.filter(p => p.id !== me.id);

   return (
      <div className="game-board">
         <div className="game-info">
            Room: {roomId} | Direction: {direction === 1 ? 'HW' : 'CCW'}
         </div>

         <div className="top-players">
            {opponents.map(p => (
               <div key={p.id} className={`opponent ${p.isTurn ? 'active' : ''}`}>
                  <div className="name">{p.name}</div>
                  <div className="card-count">🎴 {p.cardCount}</div>
               </div>
            ))}
         </div>

         <div className="center-area">
            <div className="deck" onClick={handleDraw}>
               <Card card={null} /> {/* Back of card */}
            </div>

            <div className="discard-pile">
               <Card card={activeCard} />
            </div>

            {currentColor && (
               <div
                  className="current-color-indicator"
                  style={{ background: currentColor }}
                  title={`Current Color: ${currentColor}`}
               />
            )}
         </div>

         {showColorPicker && (
            <div className="color-picker-overlay">
               <div className="color-picker">
                  <h3>Rangni tanlang:</h3>
                  <div className="colors">
                     {['red', 'blue', 'green', 'yellow'].map(c => (
                        <button
                           key={c}
                           style={{ background: c }}
                           onClick={() => handleColorSelect(c)}
                        ></button>
                     ))}
                  </div>
               </div>
            </div>
         )}

         <div className={`my-section ${isMyTurn ? 'active-turn' : ''}`}>
            <div className="turn-indicator">
               {isMyTurn ? "Sizning navbatingiz!" : `${activePlayer?.name} o‘ylamoqda...`}
            </div>

            <Hand hand={me.hand} onPlayCard={onPlayCard} isMyTurn={isMyTurn} />

            {isMyTurn && (
               <button className="pass-btn" onClick={handlePass}>O‘tkazish (Pass)</button>
            )}
         </div>

         <style>{`
                .color-picker-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 100;
                }
                .color-picker {
                    background: #333;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                }
                .color-picker .colors {
                    display: flex;
                    gap: 10px;
                }
                .color-picker button {
                    width: 60px;
                    height: 60px;
                    border: 2px solid white;
                }
                .my-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .turn-indicator {
                    margin-bottom: 10px;
                    font-size: 1.2rem;
                    font-weight: bold;
                    color: ${isMyTurn ? '#ff5722' : '#888'};
                }
            `}</style>
      </div>
   );
};

export default Board;
