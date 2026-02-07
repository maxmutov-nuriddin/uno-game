import { getRoomDoc, patchRoomDoc } from './firebaseApi.js';
import {
   applyTurnTimeout,
   buildStateForSession,
   callGameUno,
   cloneState,
   closeRoomState,
   createId,
   createRoomState,
   drawGameCard,
   getPlayerBySession,
   incVersion,
   playGameCard,
   roomRoleForSession,
   passGameTurn,
   startGame
} from './unoState.js';

const POLL_MS = 850;
const MAX_RETRIES = 8;
const MAX_PLAYERS = 10;

const normalizeRoomId = (roomId) => String(roomId || '').replace(/[^0-9]/g, '');
const normalizeRoomMode = (mode) => (mode === 'lan' ? 'lan' : 'online');

const randomRoomId = () => String(Math.floor(10000 + Math.random() * 90000));
const sanitizeError = (message) => String(message || '').replace(/\s+/g, ' ').trim();

const formatFirestoreError = (result, fallbackMessage) => {
   if (!result) return fallbackMessage;
   if (result.status === 403) {
      return "Firestore 403: ruxsat yo'q. Firebase Console > Firestore Rules da `rooms` uchun read/write oching.";
   }
   if (result.status === 401) {
      return 'Firebase 401: autentifikatsiya muvaffaqiyatsiz.';
   }
   if (result.status === 429) {
      return "Firebase limitga yetdi, birozdan keyin qayta urinib ko'ring.";
   }
   if (result.status === 400 && result.errorMessage) {
      return `Firestore 400: ${sanitizeError(result.errorMessage)}`;
   }
   if (result.errorMessage) {
      return `${fallbackMessage} (${sanitizeError(result.errorMessage)})`;
   }
   return fallbackMessage;
};

const INITIAL_TRANSPORT_STATUS = Object.freeze({
   hasConnection: false,
   isSyncing: false,
   pendingWrites: 0,
   pingMs: null,
   lastSyncAt: null,
   lastError: null
});

export class FirebaseSocket {
   constructor() {
      this.id = createId();
      this.listeners = new Map();
      this.roomId = null;
      this.sessionToken = null;
      this.role = null;
      this.lastUpdateTime = null;
      this.pollTimer = null;
      this.pollBusy = false;
      this.lastEventIds = {
         reaction: 0,
         uno: 0,
         roomClosed: 0,
         gameFinished: 0
      };
      this.activeRequests = 0;
      this.pendingWrites = 0;
      this.transportStatus = { ...INITIAL_TRANSPORT_STATUS };
   }

   on(eventName, handler) {
      if (!this.listeners.has(eventName)) {
         this.listeners.set(eventName, new Set());
      }
      this.listeners.get(eventName).add(handler);
      if (eventName === 'transport:status') {
         try {
            handler({ ...this.transportStatus });
         } catch {
            // ignore
         }
      }
   }

   off(eventName, handler) {
      if (!this.listeners.has(eventName)) return;
      if (!handler) {
         this.listeners.delete(eventName);
         return;
      }
      this.listeners.get(eventName).delete(handler);
      if (!this.listeners.get(eventName).size) {
         this.listeners.delete(eventName);
      }
   }

   emit(eventName, payload = {}) {
      this.handleEmit(eventName, payload).catch(() => {
         this.emitLocal('error:msg', { message: 'Tarmoq xatosi.' });
      });
   }

   close() {
      this.stopPolling();
      this.activeRequests = 0;
      this.pendingWrites = 0;
      this.setTransportStatus({ isSyncing: false, pendingWrites: 0 });
   }

   emitLocal(eventName, payload) {
      const handlers = this.listeners.get(eventName);
      if (!handlers) return;
      handlers.forEach((handler) => {
         try {
            handler(payload);
         } catch {
            // ignore
         }
      });
   }

   setTransportStatus(patch) {
      const next = { ...this.transportStatus, ...patch };
      const changed = Object.keys(next).some((key) => next[key] !== this.transportStatus[key]);
      if (!changed) return;
      this.transportStatus = next;
      this.emitLocal('transport:status', { ...this.transportStatus });
   }

   beginRequest(options = {}) {
      const isWrite = !!options.write;
      this.activeRequests += 1;
      if (isWrite) this.pendingWrites += 1;
      this.setTransportStatus({
         isSyncing: this.activeRequests > 0,
         pendingWrites: this.pendingWrites
      });
   }

   finishRequest(result, options = {}) {
      const isWrite = !!options.write;
      this.activeRequests = Math.max(0, this.activeRequests - 1);
      if (isWrite) this.pendingWrites = Math.max(0, this.pendingWrites - 1);

      const patch = {
         isSyncing: this.activeRequests > 0,
         pendingWrites: this.pendingWrites
      };

      const requestReachedServer = !!result && (result.ok || result.notFound || result.conflict);
      if (requestReachedServer) {
         patch.hasConnection = true;
         patch.lastSyncAt = Date.now();
         patch.lastError = null;
         if (Number.isFinite(result.durationMs)) {
            patch.pingMs = Math.max(1, Math.round(result.durationMs));
         }
      } else if (result && !result.conflict) {
         patch.lastError = result.status ? `HTTP_${result.status}` : 'NETWORK_ERROR';
      }

      this.setTransportStatus(patch);
   }

   async readRoomDoc(roomId) {
      this.beginRequest({ write: false });
      try {
         const result = await getRoomDoc(roomId);
         this.finishRequest(result, { write: false });
         return result;
      } catch (error) {
         this.finishRequest({ ok: false, errorMessage: error?.message || 'read_failed' }, { write: false });
         throw error;
      }
   }

   async writeRoomDoc(roomId, state, options = {}) {
      this.beginRequest({ write: true });
      try {
         const result = await patchRoomDoc(roomId, state, options);
         this.finishRequest(result, { write: true });
         return result;
      } catch (error) {
         this.finishRequest({ ok: false, errorMessage: error?.message || 'write_failed' }, { write: true });
         throw error;
      }
   }

   setSession(roomId, sessionToken, role) {
      this.roomId = roomId;
      this.sessionToken = sessionToken;
      this.role = role;
      this.lastUpdateTime = null;
      this.lastEventIds = {
         reaction: 0,
         uno: 0,
         roomClosed: 0,
         gameFinished: 0
      };
      this.startPolling();
   }

   startPolling() {
      this.stopPolling();
      this.pollTimer = setInterval(() => {
         this.pollRoom().catch(() => {});
      }, POLL_MS);
      this.pollRoom().catch(() => {});
   }

   stopPolling() {
      if (this.pollTimer) {
         clearInterval(this.pollTimer);
         this.pollTimer = null;
      }
   }

   processState(state) {
      if (!this.sessionToken) return;
      this.emitLocal('stateUpdate', buildStateForSession(state, this.sessionToken));

      const reactionId = state.events?.reaction?.id || 0;
      if (reactionId > this.lastEventIds.reaction) {
         this.lastEventIds.reaction = reactionId;
         if (state.events.reaction.playerId && state.events.reaction.emoji) {
            this.emitLocal('reaction:show', {
               playerId: state.events.reaction.playerId,
               emoji: state.events.reaction.emoji
            });
         }
      }

      const unoId = state.events?.uno?.id || 0;
      if (unoId > this.lastEventIds.uno) {
         this.lastEventIds.uno = unoId;
         if (state.events.uno.playerId) {
            this.emitLocal('uno:called', { playerId: state.events.uno.playerId });
         }
      }

      const finishedId = state.events?.gameFinishedId || 0;
      if (finishedId > this.lastEventIds.gameFinished) {
         this.lastEventIds.gameFinished = finishedId;
         const winner = state.players.find((player) => player.id === state.winnerId)?.name || state.gameSummary?.winnerName || 'Winner';
         this.emitLocal('gameFinished', { winner, summary: state.gameSummary || null });
      }

      const roomClosedId = state.events?.roomClosedId || 0;
      if (roomClosedId > this.lastEventIds.roomClosed || state.status === 'closed') {
         this.lastEventIds.roomClosed = Math.max(this.lastEventIds.roomClosed, roomClosedId);
         this.emitLocal('room:closed');
      }
   }

   async mutateRoom(mutator, options = {}) {
      if (!this.roomId) return { ok: false, error: 'Room missing' };

      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
         const doc = await this.readRoomDoc(this.roomId);
         if (doc.notFound) {
            this.emitLocal('room:closed');
            return { ok: false, notFound: true };
         }
         if (!doc.ok) {
            this.emitLocal('error:msg', { message: formatFirestoreError(doc, 'Xatolik yuz berdi.') });
            return { ok: false, error: 'read_failed' };
         }

         const state = cloneState(doc.state);
         const session = state.sessions[this.sessionToken];
         if (!session && !options.allowWithoutSession) {
            this.emitLocal('error:msg', { message: 'Sessiya topilmadi.' });
            return { ok: false, error: 'session_missing' };
         }

         if (applyTurnTimeout(state)) {
            incVersion(state);
         }

         const result = mutator(state);
         if (!result?.ok) {
            this.emitLocal('error:msg', { message: result?.error || 'Xatolik' });
            return result;
         }

         incVersion(state);

         const saved = await this.writeRoomDoc(this.roomId, state, { updateTime: doc.updateTime });
         if (saved.conflict) continue;
         if (!saved.ok) {
            this.emitLocal('error:msg', { message: formatFirestoreError(saved, 'Saqlashda xatolik.') });
            return { ok: false, error: 'write_failed' };
         }

         this.lastUpdateTime = saved.updateTime || null;
         this.processState(state);
         return { ok: true, state };
      }

      this.emitLocal('error:msg', { message: 'Konflikt ko\'p bo\'ldi, qayta urinib ko\'ring.' });
      return { ok: false, error: 'conflict' };
   }

   async pollRoom() {
      if (!this.roomId || this.pollBusy) return;
      this.pollBusy = true;
      try {
         const doc = await this.readRoomDoc(this.roomId);
         if (doc.notFound) {
            this.emitLocal('room:closed');
            this.stopPolling();
            return;
         }
         if (!doc.ok) return;

         const timeoutDraft = cloneState(doc.state);
         if (this.sessionToken && this.sessionToken === timeoutDraft.adminSessionToken && applyTurnTimeout(timeoutDraft)) {
            incVersion(timeoutDraft);
            const timeoutSave = await this.writeRoomDoc(this.roomId, timeoutDraft, { updateTime: doc.updateTime });
            if (timeoutSave.ok) {
               this.lastUpdateTime = timeoutSave.updateTime || null;
               this.processState(timeoutDraft);
               return;
            }
         }

         if (doc.updateTime === this.lastUpdateTime) return;
         this.lastUpdateTime = doc.updateTime || null;
         this.processState(doc.state);
      } finally {
         this.pollBusy = false;
      }
   }

   async createRoom(payload) {
      const nickname = String(payload.nickname || '').trim() || 'Player';
      const sessionToken = createId();
      const roomMode = normalizeRoomMode(payload.networkMode);

      for (let attempt = 0; attempt < 30; attempt += 1) {
         const roomId = randomRoomId();
         const state = createRoomState({
            roomId,
            nickname,
            sessionToken,
            startCardsCount: payload.startCardsCount,
            autoDrawEnabled: payload.autoDrawEnabled,
            avatarColor: payload.avatarColor,
            avatarIcon: payload.avatarIcon,
            hostSpectator: roomMode === 'lan' ? true : !!payload.hostSpectator,
            networkMode: roomMode
         });

         const created = await this.writeRoomDoc(roomId, state, { createOnly: true });
         if (created.conflict) continue;
         if (!created.ok) {
            this.emitLocal('error:msg', { message: formatFirestoreError(created, "Xona yaratib bo'lmadi.") });
            return;
         }

         this.setSession(roomId, sessionToken, 'admin');
         this.lastUpdateTime = created.updateTime || null;
         this.emitLocal('room:created', { roomId, sessionToken, role: 'admin' });
         this.processState(state);
         return;
      }

      this.emitLocal('error:msg', { message: "Xona ID band, qayta urinib ko'ring." });
   }

   async joinRoom(payload) {
      const roomId = normalizeRoomId(payload.roomId);
      if (!roomId) {
         this.emitLocal('error:msg', { message: 'Xona ID kiriting.' });
         return;
      }

      const nickname = String(payload.nickname || '').trim() || 'Player';
      const requestedMode = normalizeRoomMode(payload.networkMode);

      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
         const doc = await this.readRoomDoc(roomId);
         if (doc.notFound) {
            this.emitLocal('error:msg', { message: 'Xona topilmadi!' });
            return;
         }
         if (!doc.ok) {
            this.emitLocal('error:msg', { message: formatFirestoreError(doc, 'Xatolik yuz berdi.') });
            return;
         }

         const state = cloneState(doc.state);
         const roomMode = normalizeRoomMode(state.networkMode);
         if (roomMode !== requestedMode) {
            this.emitLocal('error:msg', {
               message: roomMode === 'lan'
                  ? 'Bu xona LAN rejimida. LAN ni tanlab kiring.'
                  : 'Bu xona ONLINE rejimida. ONLINE ni tanlab kiring.'
            });
            return;
         }
         if (state.status !== 'lobby') {
            this.emitLocal('error:msg', { message: "O'yin boshlanib bo'lgan!" });
            return;
         }
         if (state.players.length >= MAX_PLAYERS) {
            this.emitLocal('error:msg', { message: "Xona to'la!" });
            return;
         }

         const sessionToken = createId();
         const playerId = createId();
         state.players.push({
            id: playerId,
            name: nickname,
            sessionToken,
            isOnline: true,
            isAway: false,
            ready: false,
            avatarColor: payload.avatarColor || '#29b6f6',
            avatarIcon: payload.avatarIcon || 'A',
            hand: []
         });
         state.sessions[sessionToken] = { isSpectator: false, playerId };
         incVersion(state);

         const saved = await this.writeRoomDoc(roomId, state, { updateTime: doc.updateTime });
         if (saved.conflict) continue;
         if (!saved.ok) {
            this.emitLocal('error:msg', { message: formatFirestoreError(saved, "Xonaga qo'shilib bo'lmadi.") });
            return;
         }

         this.setSession(roomId, sessionToken, 'player');
         this.lastUpdateTime = saved.updateTime || null;
         this.emitLocal('room:joined', { roomId, sessionToken, role: 'player' });
         this.processState(state);
         return;
      }

      this.emitLocal('error:msg', { message: 'Konflikt, qayta urinib ko\'ring.' });
   }

   async restoreSession(payload) {
      const roomId = normalizeRoomId(payload.roomId);
      const sessionToken = String(payload.sessionToken || '').trim();
      if (!roomId || !sessionToken) {
         this.emitLocal('session:restored', { ok: false });
         return;
      }

      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
         const doc = await this.readRoomDoc(roomId);
         if (!doc.ok) {
            this.emitLocal('session:restored', { ok: false });
            return;
         }

         const state = cloneState(doc.state);
         const session = state.sessions[sessionToken];
         if (!session) {
            this.emitLocal('session:restored', { ok: false });
            return;
         }

         const player = getPlayerBySession(state, sessionToken);
         if (player) {
            player.isOnline = true;
            player.isAway = false;
         }

         incVersion(state);
         const saved = await this.writeRoomDoc(roomId, state, { updateTime: doc.updateTime });
         if (saved.conflict) continue;
         if (!saved.ok) {
            this.emitLocal('session:restored', { ok: false });
            return;
         }

         const role = roomRoleForSession(state, sessionToken);
         this.setSession(roomId, sessionToken, role);
         this.lastUpdateTime = saved.updateTime || null;
         this.emitLocal('session:restored', { ok: true, role, roomId });
         this.processState(state);
         return;
      }

      this.emitLocal('session:restored', { ok: false });
   }

   async handleEmit(eventName, payload) {
      switch (eventName) {
         case 'room:create':
            await this.createRoom(payload);
            return;
         case 'room:join':
            await this.joinRoom(payload);
            return;
         case 'session:restore':
            await this.restoreSession(payload);
            return;
         case 'game:start':
            await this.mutateRoom((state) => {
               if (this.sessionToken !== state.adminSessionToken) return { ok: false, error: 'Faqat admin boshlaydi.' };
               return startGame(state);
            });
            return;
         case 'game:play':
            await this.mutateRoom((state) => {
               const player = getPlayerBySession(state, this.sessionToken);
               if (!player) return { ok: false, error: "Siz o'yinchi emassiz." };
               const cardId = Array.isArray(payload.cardIds) ? payload.cardIds[0] : payload.cardId;
               return playGameCard(state, player.id, cardId, payload.chosenColor || null);
            });
            return;
         case 'game:draw':
            await this.mutateRoom((state) => {
               const player = getPlayerBySession(state, this.sessionToken);
               if (!player) return { ok: false, error: "Siz o'yinchi emassiz." };
               return drawGameCard(state, player.id);
            });
            return;
         case 'game:pass':
            await this.mutateRoom((state) => {
               const player = getPlayerBySession(state, this.sessionToken);
               if (!player) return { ok: false, error: "Siz o'yinchi emassiz." };
               return passGameTurn(state, player.id);
            });
            return;
         case 'game:uno':
            await this.mutateRoom((state) => {
               const player = getPlayerBySession(state, this.sessionToken);
               if (!player) return { ok: false, error: "Siz o'yinchi emassiz." };
               return callGameUno(state, player.id);
            });
            return;
         case 'player:ready':
            await this.mutateRoom((state) => {
               const player = getPlayerBySession(state, this.sessionToken);
               if (!player) return { ok: false, error: "Siz o'yinchi emassiz." };
               if (state.status !== 'lobby') return { ok: false, error: "O'yin boshlangan." };
               player.ready = typeof payload.isReady === 'boolean' ? payload.isReady : !player.ready;
               return { ok: true };
            });
            return;
         case 'player:visibility':
            await this.mutateRoom((state) => {
               const player = getPlayerBySession(state, this.sessionToken);
               if (!player) return { ok: true };
               player.isAway = !!payload.isAway;
               return { ok: true };
            });
            return;
         case 'reaction:send':
            await this.mutateRoom((state) => {
               const player = getPlayerBySession(state, this.sessionToken);
               if (!player) return { ok: false, error: "Siz o'yinchi emassiz." };
               const emoji = String(payload.emoji || '').trim();
               if (!emoji) return { ok: false, error: 'Sticker tanlang.' };
               state.events.reaction.id += 1;
               state.events.reaction.playerId = player.id;
               state.events.reaction.emoji = emoji;
               return { ok: true };
            });
            return;
         case 'room:close':
            await this.mutateRoom((state) => {
               if (this.sessionToken !== state.adminSessionToken) return { ok: false, error: 'Faqat admin yopadi.' };
               const adminPlayer = getPlayerBySession(state, this.sessionToken);
               if (adminPlayer?.ready) return { ok: false, error: "Xonani yopish uchun tayyorlikni o'chiring." };
               closeRoomState(state);
               return { ok: true };
            });
            return;
         case 'room:leave':
            await this.mutateRoom((state) => {
               const session = state.sessions[this.sessionToken];
               if (!session) return { ok: true };

               if (session.isSpectator) {
                  delete state.sessions[this.sessionToken];
               } else if (session.playerId) {
                  const idx = state.players.findIndex((player) => player.id === session.playerId);
                  if (idx !== -1) {
                     if (state.status === 'lobby') {
                        state.players.splice(idx, 1);
                     } else {
                        state.players[idx].isOnline = false;
                        state.players[idx].isAway = false;
                     }
                  }
                  delete state.sessions[this.sessionToken];
               }

               if (!state.players.length) closeRoomState(state);
               return { ok: true };
            });
            this.stopPolling();
            return;
         default:
            return;
      }
   }
}

export const createFirebaseSocket = () => new FirebaseSocket();
