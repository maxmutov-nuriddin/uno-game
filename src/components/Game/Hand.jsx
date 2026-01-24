import React, { useRef } from 'react';
import Card from './Card';
import { motion, AnimatePresence } from 'framer-motion';

const Hand = ({ hand, onPlayCard, isMyTurn }) => {
   const scrollRef = useRef(null);

   return (
      <div className="hand-wrapper" ref={scrollRef}>
         <div className="hand-container">
            <AnimatePresence>
               {hand.map((card, index) => (
                  <motion.div
                     key={card.id || index}
                     initial={{ opacity: 0, y: 50, scale: 0.5 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: -100, scale: 0.5 }}
                     transition={{ duration: 0.3, delay: index * 0.05 }}
                     className="card-slot"
                     style={{ zIndex: index }}
                  >
                     <Card
                        card={card}
                        playable={isMyTurn}
                        onClick={() => onPlayCard(card.id)}
                     />
                  </motion.div>
               ))}
            </AnimatePresence>
         </div>
      </div>
   );
};

export default Hand;
