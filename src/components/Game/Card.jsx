import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ card, onClick, playable = false, size = 'normal' }) => {
   // size: 'normal' | 'small' | 'large'

   // Helper to get image path
   const getImagePath = (c) => {
      if (!c) return '/unocards/card-back.png'; // We need a back image, or CSS fallback

      let { color, type, value } = c;
      let filename = '';

      if (type === 'wild') return '/unocards/wild-card-clipart-md.png';
      if (type === 'plus4') return '/unocards/wild-draw-four-card-clipart-md.png';

      // For colored cards
      if (type === 'plus2') type = 'draw-two';

      if (type === 'number') {
         filename = `${color}-${value}-card-clipart-md.png`;
      } else {
         filename = `${color}-${type}-card-clipart-md.png`;
      }

      return `/unocards/${filename}`;
   };

   if (!card) {
      // CSS Fallback for back if image missing
      return (
         <motion.div
            className={`card-wrapper ${size}`}
            onClick={onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
         >
            <div className="card-back-premium">
               <span className="uno-logo">UNO</span>
            </div>
         </motion.div>
      );
   }

   const imagePath = getImagePath(card);

   const highlightColor = card.type === 'wild' || card.type === 'plus4' ? (card.chosenColor || null) : null;

   return (
      <motion.div
         className={`card-wrapper ${size} ${playable ? 'playable' : ''}`}
         onClick={onClick}
         initial={{ opacity: 0, scale: 0.8 }}
         animate={{ opacity: 1, scale: 1 }}
         exit={{ opacity: 0, scale: 0.5 }}
      >
         <div className={`card-highlight ${highlightColor ? `color-${highlightColor}` : ''}`}>
            <div className="card-color-overlay" />
            <img src={imagePath} alt={`${card.color} ${card.type}`} draggable="false" />
         </div>
      </motion.div>
   );
};

export default Card;
