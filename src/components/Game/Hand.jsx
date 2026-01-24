import React, { useState } from 'react';
import Card from './Card';
import { motion, AnimatePresence } from 'framer-motion';

const Hand = ({ hand, onCardClick, selectedIds = [], isMyTurn, activeCard, currentColor }) => {

   // Server-side rules logic for dimming
   const isPlayable = (card) => {
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

   const getCardLayout = (index, total) => {
      const mid = (total - 1) / 2;
      const diff = index - mid;

      const rotationUnit = total > 10 ? 3 : 5;
      const yOffsetUnit = 2.5;

      const rotation = diff * rotationUnit;
      const yOffset = Math.abs(diff) * Math.abs(diff) * yOffsetUnit;
      const xOffset = diff * (total > 10 ? 15 : 25);

      return { rotate: rotation, y: yOffset, x: xOffset, z: index };
   };

   return (
      <div className="hand-flex">
         <AnimatePresence>
            {hand.map((card, index) => {
               const layout = getCardLayout(index, hand.length);
               const playable = isPlayable(card);

               return (
                  <motion.div
                     key={card.id || index}
                     initial={{ opacity: 0, y: 150, scale: 0.5 }}
                     animate={{
                        opacity: 1,
                        y: layout.y,
                        rotate: layout.rotate,
                        x: layout.x,
                        scale: 1
                     }}
                     exit={{ opacity: 0, y: 50, scale: 0 }}
                     whileHover={playable ? { y: layout.y - 40, scale: 1.08, zIndex: 1000 } : {}}
                     whileTap={playable ? { scale: 0.98 } : {}}
                     className={`fanned-card ${!playable && isMyTurn ? 'dimmed' : ''} ${selectedIds.includes(card.id) ? 'selected' : ''}`}
                     style={{ position: 'absolute', zIndex: layout.z, transformOrigin: 'bottom center' }}
                  >
                     <Card
                        card={card}
                        playable={playable}
                        onClick={() => onCardClick(card)}
                     />
                  </motion.div>
               );
            })}
         </AnimatePresence>
      </div>
   );
};

export default Hand;
