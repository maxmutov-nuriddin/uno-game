import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ card, onClick, playable = false, size = 'normal' }) => {
   // size: 'normal' | 'small' | 'large'

   if (!card) {
      // BACK OF CARD
      return (
         <div className={`card card-back ${size}`} onClick={onClick}>
            <div className="card-inner-back">
               <span className="logo-text">UNO</span>
            </div>
         </div>
      );
   }

   const { color, type, value } = card;

   const getSymbol = () => {
      if (type === 'number') return value;
      if (type === 'skip') return '⊘';
      if (type === 'reverse') return '⇄';
      if (type === 'plus2') return '+2';
      if (type === 'plus4') return '+4';
      if (type === 'wild') return '❖';
      return '?';
   };

   const symbol = getSymbol();
   const isSpecial = type !== 'number';

   return (
      <motion.div
         whileHover={playable ? { y: -20, scale: 1.1, zIndex: 100 } : {}}
         whileTap={playable ? { scale: 0.95 } : {}}
         className={`card card-face ${color} ${size} ${playable ? 'playable' : ''}`}
         onClick={onClick}
      >
         <div className="card-design-oval">
            <span className="card-big-symbol" data-symbol={symbol}>{symbol}</span>
         </div>
         <span className="corner-symbol top-left">{symbol}</span>
         <span className="corner-symbol bottom-right">{symbol}</span>
      </motion.div>
   );
};

export default Card;
