import React, { useState, useEffect } from 'react';
import Card from './Card';
import { motion, AnimatePresence } from 'framer-motion';

const Hand = ({ hand, onCardClick, selectedIds = [], isMyTurn, activeCard, currentColor }) => {
   const [isCoarsePointer, setIsCoarsePointer] = useState(false);

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

      const rotationUnit = 0;
      const yOffsetUnit = 0;

      const rotation = diff * rotationUnit;
      const yOffset = Math.abs(diff) * Math.abs(diff) * yOffsetUnit;
      const baseWidth = typeof window !== 'undefined'
         ? Math.min(window.innerWidth * 0.82, 820)
         : 600;
      const maxSpread = Math.max(220, baseWidth - 140);
      const xUnit = Math.min(26, maxSpread / Math.max(1, total - 1));
      const xOffset = diff * xUnit;

      return { rotate: rotation, y: yOffset, x: xOffset, z: index };
   };

   return (
      <div className={`hand-flex ${selectedIds.length > 0 ? 'has-selection' : ''}`}>
         <AnimatePresence>
            {hand.map((card, index) => {
               const layout = getCardLayout(index, hand.length);
               const playable = isPlayable(card);
               const isSelected = selectedIds.includes(card.id);
               const selectedLift = isSelected ? -48 : 0;

               return (
                  <motion.div
                     key={card.id || index}
                     initial={{ opacity: 0, y: 150, scale: 0.5 }}
                     animate={{
                        opacity: 1,
                        y: layout.y + selectedLift,
                        rotate: layout.rotate,
                        x: layout.x,
                        scale: 1
                     }}
                     exit={{ opacity: 0, y: 50, scale: 0 }}
                     whileHover={playable && !isCoarsePointer ? { y: layout.y + selectedLift - 40, scale: 1.08, zIndex: 1000 } : {}}
                     whileTap={playable ? (isCoarsePointer ? { y: layout.y + selectedLift - 18, scale: 1.04, zIndex: 1000 } : { scale: 0.98 }) : {}}
                     className={`fanned-card ${!playable && isMyTurn ? 'dimmed' : ''} ${isSelected ? 'selected' : ''}`}
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
