import React from 'react';
import Card from './Card';

const Hand = ({ hand, onPlayCard, isMyTurn }) => {
   return (
      <div className="player-hand-container">
         {hand.map((card, index) => (
            <div key={index} style={{ marginLeft: index === 0 ? 0 : '-30px' }}>
               <Card
                  card={card}
                  playable={isMyTurn} // Simplified, ideally check if specific card is playable
                  onClick={() => onPlayCard(index, card)}
               />
            </div>
         ))}
      </div>
   );
};

export default Hand;
