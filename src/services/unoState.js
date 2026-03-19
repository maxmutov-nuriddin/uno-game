const COLORS = ['red', 'blue', 'green', 'yellow'];
const SPECIALS = ['skip', 'reverse', 'plus2'];
const AVATAR_COLORS = ['#ff5252', '#ffb300', '#00c853', '#29b6f6', '#ab47bc', '#ff7043', '#26a69a', '#5c6bc0'];
const AVATAR_ICONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const random = () => Math.random().toString(36).slice(2);
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const createId = () => {
   if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
   }
   return `${random()}-${Date.now()}`;
};

const cardId = () => random().slice(0, 9);

const shuffle = (arr) => {
   for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
   }
};

const createDeck = () => {
   const cards = [];
   COLORS.forEach((color) => {
      cards.push({ id: cardId(), color, type: 'number', value: 0 });
      for (let i = 1; i <= 9; i += 1) {
         cards.push({ id: cardId(), color, type: 'number', value: i });
         cards.push({ id: cardId(), color, type: 'number', value: i });
      }
      SPECIALS.forEach((type) => {
         cards.push({ id: cardId(), color, type, value: null });
         cards.push({ id: cardId(), color, type, value: null });
      });
   });

   for (let i = 0; i < 4; i += 1) {
      cards.push({ id: cardId(), color: 'black', type: 'wild', value: null });
      cards.push({ id: cardId(), color: 'black', type: 'plus4', value: null });
   }

   shuffle(cards);
   return cards;
};

const normalizeStartCards = (count) => {
   const parsed = Number.parseInt(count, 10);
   if (Number.isNaN(parsed)) return 7;
   return Math.min(12, Math.max(4, parsed));
};

const normalizeRoomMode = (mode) => (mode === 'lan' ? 'lan' : 'online');

export const createRoomState = ({ roomId, nickname, sessionToken, startCardsCount, autoDrawEnabled, avatarColor, avatarIcon, hostSpectator, networkMode }) => {
   const state = {
      roomId,
      networkMode: normalizeRoomMode(networkMode),
      status: 'lobby',
      version: 1,
      createdAt: Date.now(),
      adminSessionToken: sessionToken,
      sessions: {},
      players: [],
      startCardsCount: normalizeStartCards(startCardsCount),
      autoDrawEnabled: !!autoDrawEnabled,
      deck: [],
      discardPile: [],
      turnIndex: 0,
      direction: 1,
      currentColor: null,
      activeCard: null,
      previousActiveCard: null,
      pendingDrawCount: 0,
      pendingDrawPlayerId: null,
      pendingUnoIds: [],
      pendingUnoPlayerId: null,
      justDrewPlayablePlayerId: null,
      hasDrawnThisTurnPlayerId: null,
      lastActionId: 0,
      lastActionType: null,
      turnDeadline: null,
      lastPlayEvent: null,
      lastPlayId: 0,
      highlightEvent: null,
      highlightEventId: 0,
      winnerId: null,
      gameStartAt: null,
      gameSummary: null,
      totalMoves: 0,
      cardsDrawnByPlayer: {},
      streakByPlayer: {},
      maxHandSizeByPlayer: {},
      events: {
         reaction: { id: 0, playerId: null, emoji: '' },
         uno: { id: 0, playerId: null },
         roomClosedId: 0,
         gameFinishedId: 0
      }
   };

   if (hostSpectator) {
      state.sessions[sessionToken] = { isSpectator: true, playerId: null };
      return state;
   }

   const playerId = createId();
   state.players.push({
      id: playerId,
      name: nickname || 'Player',
      sessionToken,
      isOnline: true,
      isAway: false,
      ready: false,
      avatarColor: AVATAR_COLORS.includes(avatarColor) ? avatarColor : randomFrom(AVATAR_COLORS),
      avatarIcon: AVATAR_ICONS.includes(avatarIcon) ? avatarIcon : randomFrom(AVATAR_ICONS),
      hand: []
   });
   state.sessions[sessionToken] = { isSpectator: false, playerId };
   return state;
};

const getCurrentPlayer = (state) => state.players[state.turnIndex] || null;
const getPlayerById = (state, playerId) => state.players.find((p) => p.id === playerId) || null;
export const getPlayerBySession = (state, sessionToken) => {
   const session = state.sessions[sessionToken];
   if (!session || session.isSpectator || !session.playerId) return null;
   return getPlayerById(state, session.playerId);
};

const nextPlayerIndex = (state, step = 1) => {
   let idx = (state.turnIndex + step * state.direction) % state.players.length;
   if (idx < 0) idx += state.players.length;
   return idx;
};

const setDeadline = (state) => {
   if (state.status === 'playing' && state.players.length > 0) {
      state.turnDeadline = Date.now() + 20_000;
   } else {
      state.turnDeadline = null;
   }
};

const reshuffle = (state) => {
   if (state.discardPile.length <= 1) return;
   const top = state.discardPile[state.discardPile.length - 1];
   const rest = state.discardPile.slice(0, -1);
   state.discardPile = [top];
   state.deck.unshift(...rest);
   shuffle(state.deck);
};

const drawCardFromDeck = (state) => {
   if (!state.deck.length) reshuffle(state);
   return state.deck.pop() || null;
};

const validateMove = (card, activeCard, currentColor) => {
   if (!card) return false;
   if (!activeCard) return true;
   if (card.type === 'wild' || card.type === 'plus4') return true;
   if (card.color === currentColor) return true;
   if (card.type === activeCard.type) {
      if (card.type !== 'number') return true;
      return card.value === activeCard.value;
   }
   return false;
};

const canRespondToPendingDraw = (state, card) => {
   if (!card) return false;
   if (card.type === 'plus4') return true;
   if (card.type !== 'plus2') return false;
   if (state.activeCard?.type === 'plus2') return true;
   return card.color === state.currentColor;
};

const hasPlayable = (state, player) => player.hand.some((card) => validateMove(card, state.activeCard, state.currentColor));

const updateMaxHand = (state, player) => {
   const current = state.maxHandSizeByPlayer[player.id] || 0;
   if (player.hand.length > current) state.maxHandSizeByPlayer[player.id] = player.hand.length;
};

const applyUnoPenalty = (state, currentPlayerId) => {
   if (!state.pendingUnoPlayerId) return;
   if (state.pendingUnoPlayerId === currentPlayerId) return;
   if (!state.pendingUnoIds.includes(state.pendingUnoPlayerId)) return;

   const target = getPlayerById(state, state.pendingUnoPlayerId);
   if (!target) return;

   for (let i = 0; i < 2; i += 1) {
      const card = drawCardFromDeck(state);
      if (card) target.hand.push(card);
   }
   state.cardsDrawnByPlayer[target.id] = (state.cardsDrawnByPlayer[target.id] || 0) + 2;
   state.pendingUnoIds = state.pendingUnoIds.filter((id) => id !== target.id);
   state.pendingUnoPlayerId = null;
};

const autoDrawIfNeeded = (state) => {
   if (state.pendingDrawCount > 0 || state.status !== 'playing') return;
   const player = getCurrentPlayer(state);
   if (!player) return;
   if (hasPlayable(state, player)) return;

   const card = drawCardFromDeck(state);
   if (card) {
      player.hand.push(card);
      state.cardsDrawnByPlayer[player.id] = (state.cardsDrawnByPlayer[player.id] || 0) + 1;
      updateMaxHand(state, player);
      if (player.hand.length > 1) {
         state.pendingUnoIds = state.pendingUnoIds.filter((id) => id !== player.id);
      }
      if (validateMove(card, state.activeCard, state.currentColor)) {
         state.justDrewPlayablePlayerId = player.id;
         state.hasDrawnThisTurnPlayerId = player.id;
         return;
      }
   }

   // O'ynaydigan karta yo'q — navbatni ketma-ket o'tkazish
   let idx = state.turnIndex + state.direction;
   if (idx < 0) idx += state.players.length;
   idx = idx % state.players.length;
   state.turnIndex = idx;
   state.justDrewPlayablePlayerId = null;
   state.hasDrawnThisTurnPlayerId = null;
};
const finishGame = (state, winner) => {
   state.status = 'finished';
   state.winnerId = winner.id;
   state.lastActionType = 'play';
   state.lastActionId += 1;
   state.events.gameFinishedId += 1;

   const durationMs = state.gameStartAt ? Date.now() - state.gameStartAt : 0;
   const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));
   const playersSummary = state.players.map((player) => ({
      id: player.id,
      name: player.name,
      cardCount: player.hand.length,
      cardsDrawn: state.cardsDrawnByPlayer[player.id] || 0
   }));

   let maxDrawn = 0;
   playersSummary.forEach((player) => {
      if (player.cardsDrawn > maxDrawn) maxDrawn = player.cardsDrawn;
   });

   state.gameSummary = {
      durationSeconds,
      totalMoves: state.totalMoves,
      winnerName: winner.name,
      players: playersSummary,
      mostDrawnPlayers: playersSummary.filter((p) => p.cardsDrawn === maxDrawn).map((p) => p.name),
      mostDrawnCount: maxDrawn,
      mvpName: playersSummary[0]?.name || '',
      mvpReason: 'Eng kam doborga ega'
   };
};

const advanceTurn = (state, skip = false, actionType = null) => {
   if (!state.players.length) return;

   let step = state.direction;
   if (skip) step *= 2;

   state.turnIndex = (state.turnIndex + step) % state.players.length;
   if (state.turnIndex < 0) state.turnIndex += state.players.length;

   state.justDrewPlayablePlayerId = null;
   state.hasDrawnThisTurnPlayerId = null;

   if (actionType) {
      state.lastActionType = actionType;
      state.lastActionId += 1;
      state.totalMoves += 1;
   }

   if (state.autoDrawEnabled) autoDrawIfNeeded(state);
   setDeadline(state);
};

export const startGame = (state) => {
   if (state.players.length < 2) return { ok: false, error: "O'yin uchun kamida 2 o'yinchi kerak." };
   if (!state.players.every((player) => player.ready)) return { ok: false, error: "Hamma tayyor bo'lishi kerak." };

   state.status = 'playing';
   state.deck = createDeck();
   state.discardPile = [];
   state.direction = 1;
   state.pendingDrawCount = 0;
   state.pendingDrawPlayerId = null;
   state.pendingUnoIds = [];
   state.pendingUnoPlayerId = null;
   state.justDrewPlayablePlayerId = null;
   state.hasDrawnThisTurnPlayerId = null;
   state.lastActionId = 0;
   state.lastActionType = null;
   state.lastPlayEvent = null;
   state.lastPlayId = 0;
   state.highlightEvent = null;
   state.highlightEventId = 0;
   state.winnerId = null;
   state.gameSummary = null;
   state.gameStartAt = Date.now();
   state.totalMoves = 0;
   state.cardsDrawnByPlayer = {};
   state.streakByPlayer = {};
   state.maxHandSizeByPlayer = {};
   state.turnIndex = 0;

   state.players.forEach((player) => {
      player.hand = [];
      state.cardsDrawnByPlayer[player.id] = 0;
      state.streakByPlayer[player.id] = 0;
      for (let i = 0; i < state.startCardsCount; i += 1) {
         const card = drawCardFromDeck(state);
         if (card) player.hand.push(card);
      }
      state.maxHandSizeByPlayer[player.id] = player.hand.length;
   });

   let firstCard = drawCardFromDeck(state);
   while (firstCard && firstCard.type !== 'number') {
      state.deck.unshift(firstCard);
      shuffle(state.deck);
      firstCard = drawCardFromDeck(state);
   }

   state.discardPile = firstCard ? [firstCard] : [];
   state.activeCard = firstCard || null;
   state.previousActiveCard = null;
   state.currentColor = firstCard?.color || 'red';

   if (state.autoDrawEnabled) autoDrawIfNeeded(state);
   setDeadline(state);
   return { ok: true };
};

export const playGameCard = (state, playerId, cardId, chosenColor = null) => {
   if (state.status !== 'playing') return { ok: false, error: "O'yin boshlanmagan." };

   const player = getCurrentPlayer(state);
   if (!player || player.id !== playerId) return { ok: false, error: 'Hozir sizning navbatingiz emas.' };

   applyUnoPenalty(state, playerId);

   if (Array.isArray(cardId)) return { ok: false, error: 'Bu yurishda faqat bitta karta.' };

   const index = player.hand.findIndex((card) => card.id === cardId);
   if (index === -1) return { ok: false, error: 'Karta topilmadi.' };

   const card = player.hand[index];
   if (state.pendingDrawCount > 0 && state.pendingDrawPlayerId === playerId && !canRespondToPendingDraw(state, card)) {
      return { ok: false, error: 'Avval tortish kerak.' };
   }

   if (!validateMove(card, state.activeCard, state.currentColor)) {
      return { ok: false, error: 'Bu karta mos emas!' };
   }

   const beforeHandCount = player.hand.length;
   player.hand.splice(index, 1);
   state.discardPile.push(card);
   state.previousActiveCard = state.activeCard;
   state.activeCard = card;
   state.lastPlayEvent = { playerId, card };
   state.lastPlayId += 1;
   state.totalMoves += 1;

   state.streakByPlayer[player.id] = (state.streakByPlayer[player.id] || 0) + 1;
   if (state.streakByPlayer[player.id] === 3) {
      state.highlightEvent = { type: 'streak', playerId, count: 3 };
      state.highlightEventId += 1;
   }

   if (player.hand.length === 1) {
      if (!state.pendingUnoIds.includes(player.id)) state.pendingUnoIds.push(player.id);
      state.pendingUnoPlayerId = player.id;
   } else if (player.hand.length > 1) {
      state.pendingUnoIds = state.pendingUnoIds.filter((id) => id !== player.id);
      if (state.pendingUnoPlayerId === player.id) state.pendingUnoPlayerId = null;
   }

   let nextSkip = false;
   let drawCount = 0;
   if (card.type === 'wild') {
      state.currentColor = chosenColor || 'red';
   } else if (card.type === 'plus4') {
      state.currentColor = chosenColor || 'red';
      drawCount = 4;
   } else if (card.type === 'plus2') {
      state.currentColor = card.color;
      drawCount = 2;
   } else if (card.type === 'skip') {
      state.currentColor = card.color;
      nextSkip = true;
   } else if (card.type === 'reverse') {
      state.currentColor = card.color;
      if (state.players.length === 2) nextSkip = true;
      else state.direction *= -1;
   } else {
      state.currentColor = card.color;
   }

   if ((state.maxHandSizeByPlayer[player.id] || 0) >= 6 && player.hand.length <= 2 && beforeHandCount >= 3) {
      state.highlightEvent = { type: 'comeback', playerId };
      state.highlightEventId += 1;
   }

   if (player.hand.length === 0) {
      finishGame(state, player);
      return { ok: true };
   }

   if (drawCount > 0) {
      const idx = nextPlayerIndex(state, 1);
      const nextPlayer = state.players[idx];
      state.pendingDrawCount = state.pendingDrawCount > 0 ? state.pendingDrawCount + drawCount : drawCount;
      state.pendingDrawPlayerId = nextPlayer.id;
      state.turnIndex = idx;
      state.lastActionType = 'play';
      state.lastActionId += 1;
      setDeadline(state);
      return { ok: true };
   }

   advanceTurn(state, nextSkip, 'play');
   return { ok: true };
};
export const drawGameCard = (state, playerId) => {
   if (state.status !== 'playing') return { ok: false, error: "O'yin boshlanmagan." };

   const player = getCurrentPlayer(state);
   if (!player || player.id !== playerId) return { ok: false, error: 'Hozir sizning navbatingiz emas.' };

   applyUnoPenalty(state, playerId);
   state.streakByPlayer[playerId] = 0;

   if (state.pendingDrawCount === 0 && state.hasDrawnThisTurnPlayerId === playerId) {
      return { ok: false, error: "Bu yurishda allaqachon karta oldingiz." };
   }

   if (state.pendingDrawCount > 0 && state.pendingDrawPlayerId === playerId) {
      const hasResponse = player.hand.some((card) => canRespondToPendingDraw(state, card));
      if (hasResponse) {
         return { ok: false, error: 'Avval mos +2 yoki +4 tashlang.' };
      }

      for (let i = 0; i < state.pendingDrawCount; i += 1) {
         const card = drawCardFromDeck(state);
         if (card) player.hand.push(card);
      }
      state.cardsDrawnByPlayer[player.id] = (state.cardsDrawnByPlayer[player.id] || 0) + state.pendingDrawCount;
      updateMaxHand(state, player);

      state.pendingDrawCount = 0;
      state.pendingDrawPlayerId = null;
      advanceTurn(state, false, 'draw');
      return { ok: true };
   }

   const card = drawCardFromDeck(state);
   if (card) {
      player.hand.push(card);
      state.cardsDrawnByPlayer[player.id] = (state.cardsDrawnByPlayer[player.id] || 0) + 1;
      updateMaxHand(state, player);
      if (player.hand.length > 1) {
         state.pendingUnoIds = state.pendingUnoIds.filter((id) => id !== player.id);
         if (state.pendingUnoPlayerId === player.id) state.pendingUnoPlayerId = null;
      }
   }

   state.hasDrawnThisTurnPlayerId = playerId;
   const isPlayable = card && validateMove(card, state.activeCard, state.currentColor);
   if (!isPlayable) {
      advanceTurn(state, false, 'draw');
      return { ok: true };
   }

   state.justDrewPlayablePlayerId = playerId;
   setDeadline(state);
   return { ok: true };
};

export const passGameTurn = (state, playerId) => {
   if (state.status !== 'playing') return { ok: false, error: "O'yin boshlanmagan." };

   const player = getCurrentPlayer(state);
   if (!player || player.id !== playerId) return { ok: false, error: 'Hozir sizning navbatingiz emas.' };
   if (state.pendingDrawCount > 0 && state.pendingDrawPlayerId === playerId) return { ok: false, error: 'Avval tortish kerak.' };

   applyUnoPenalty(state, playerId);
   state.streakByPlayer[playerId] = 0;
   if (state.justDrewPlayablePlayerId === playerId) state.justDrewPlayablePlayerId = null;
   advanceTurn(state, false, 'pass');
   return { ok: true };
};

export const callGameUno = (state, playerId) => {
   if (!state.pendingUnoIds.includes(playerId)) return { ok: false, error: 'UNO hozir kerak emas.' };
   state.pendingUnoIds = state.pendingUnoIds.filter((id) => id !== playerId);
   if (state.pendingUnoPlayerId === playerId) state.pendingUnoPlayerId = null;
   state.events.uno.id += 1;
   state.events.uno.playerId = playerId;
   return { ok: true };
};

export const applyTurnTimeout = (state) => {
   if (state.status !== 'playing') return false;
   if (!state.turnDeadline || Date.now() < state.turnDeadline) return false;

   const player = getCurrentPlayer(state);
   if (!player) return false;
   if (state.pendingDrawCount > 0 && state.pendingDrawPlayerId === player.id) return false;

   applyUnoPenalty(state, player.id);
   state.streakByPlayer[player.id] = 0;

   const card = drawCardFromDeck(state);
   if (card) {
      player.hand.push(card);
      state.cardsDrawnByPlayer[player.id] = (state.cardsDrawnByPlayer[player.id] || 0) + 1;
      updateMaxHand(state, player);
      if (player.hand.length > 1) {
         state.pendingUnoIds = state.pendingUnoIds.filter((id) => id !== player.id);
         if (state.pendingUnoPlayerId === player.id) state.pendingUnoPlayerId = null;
      }
   }

   advanceTurn(state, false, 'pass');
   return true;
};

export const buildPublicState = (state) => ({
   roomId: state.roomId,
   networkMode: normalizeRoomMode(state.networkMode),
   status: state.status,
   activeCard: state.activeCard,
   previousActiveCard: state.previousActiveCard,
   currentColor: state.currentColor,
   direction: state.direction,
   turnPlayerId: state.players[state.turnIndex]?.id || null,
   turnDeadline: state.turnDeadline,
   lastPlayEvent: state.lastPlayEvent,
   lastPlayId: state.lastPlayId,
   highlightEvent: state.highlightEvent,
   highlightEventId: state.highlightEventId,
   autoDrawEnabled: state.autoDrawEnabled,
   pendingDrawCount: state.pendingDrawCount,
   pendingDrawPlayerId: state.pendingDrawPlayerId,
   pendingUnoIds: state.pendingUnoIds,
   pendingUnoPlayerId: state.pendingUnoPlayerId,
   justDrewPlayablePlayerId: state.justDrewPlayablePlayerId,
   lastActionId: state.lastActionId,
   lastActionType: state.lastActionType,
   gameSummary: state.gameSummary,
   players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      cardCount: player.hand.length,
      isOnline: !!player.isOnline,
      isAway: !!player.isAway,
      ready: !!player.ready,
      avatarColor: player.avatarColor,
      avatarIcon: player.avatarIcon,
      isAdmin: player.sessionToken === state.adminSessionToken
   }))
});

export const buildStateForSession = (state, sessionToken) => {
   const base = buildPublicState(state);
   const player = getPlayerBySession(state, sessionToken);
   if (!player) return base;
   return {
      ...base,
      me: {
         ...player,
         hand: player.hand
      }
   };
};

export const roomRoleForSession = (state, sessionToken) => {
   if (sessionToken === state.adminSessionToken) return 'admin';
   return 'player';
};

export const closeRoomState = (state) => {
   state.status = 'closed';
   state.events.roomClosedId += 1;
};

export const incVersion = (state) => {
   state.version = (state.version || 0) + 1;
};

export const cloneState = (state) => JSON.parse(JSON.stringify(state));
