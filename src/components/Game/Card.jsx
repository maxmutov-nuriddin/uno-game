import React from 'react';

const Card = ({ card, onClick, playable }) => {
   // Determine card background color
   const getColor = (c) => {
      if (!c) return 'black';
      return c; // 'red', 'blue', 'green', 'yellow', 'black'
   };

   const displayValue = () => {
      if (!card) return 'UNO'; // Back of card
      if (card.type === 'number') return card.value;
      if (card.type === 'skip') return '🚫';
      if (card.type === 'reverse') return '🔁';
      if (card.type === 'plus2') return '+2';
      if (card.type === 'wild') return '🌈';
      if (card.type === 'plus4') return '+4';
      return '?';
   };

   const isBack = !card;

   return (
      <div
         className={`card ${isBack ? 'card-back' : 'card-face'} ${playable ? 'playable' : ''} ${card?.color || 'black'}`}
         onClick={onClick}
      >
         <div className="card-center">
            {displayValue()}
         </div>
         {!isBack && <div className="card-corner top-left">{displayValue()}</div>}
         {!isBack && <div className="card-corner bottom-right">{displayValue()}</div>}
      </div>
   );
};

export default Card;
