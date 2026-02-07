import { firebaseConfig } from '../config/firebase.js';

const projectId = firebaseConfig.projectId;
const apiKey = firebaseConfig.apiKey;
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const roomCollection = 'rooms';
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const buildUrl = (roomId, params = {}) => {
   const query = new URLSearchParams({ key: apiKey });
   Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) query.set(k, String(v));
   });
   return `${baseUrl}/${roomCollection}/${roomId}?${query.toString()}`;
};

const parseDoc = (doc) => {
   const payload = doc?.fields?.payload?.stringValue;
   if (!payload) return null;
   return {
      state: JSON.parse(payload),
      updateTime: doc.updateTime || null
   };
};

const normalizeUpdateTime = (value) => {
   const raw = String(value || '').trim();
   if (!raw) return '';
   return raw;
};

const parseFirestoreErrorMessage = async (response) => {
   try {
      const payload = await response.json();
      return payload?.error?.message || '';
   } catch {
      return '';
   }
};

const isPreconditionConflict = (errorMessage) => {
   const normalized = String(errorMessage || '').toLowerCase();
   return (
      /update[_\s]?time/.test(normalized) ||
      /currentdocument\.updatetime/.test(normalized) ||
      (/stored version/.test(normalized) && /required base version/.test(normalized)) ||
      /does not match the required base version/.test(normalized)
   );
};

export const getRoomDoc = async (roomId) => {
   const started = nowMs();
   const response = await fetch(buildUrl(roomId), {
      method: 'GET',
      headers: { Accept: 'application/json' }
   });
   const durationMs = Math.round(nowMs() - started);

   if (response.status === 404) return { ok: false, notFound: true, durationMs };
   if (!response.ok) {
      const errorMessage = await parseFirestoreErrorMessage(response);
      return { ok: false, status: response.status, durationMs, errorMessage };
   }

   const doc = await response.json();
   const parsed = parseDoc(doc);
   if (!parsed) return { ok: false, status: 500, durationMs };
   return { ok: true, ...parsed, durationMs };
};

export const patchRoomDoc = async (roomId, state, options = {}) => {
   const params = {};
   if (options.createOnly) params['currentDocument.exists'] = 'false';
   if (options.updateTime) params['currentDocument.updateTime'] = normalizeUpdateTime(options.updateTime);

   const started = nowMs();
   const response = await fetch(buildUrl(roomId, params), {
      method: 'PATCH',
      headers: {
         Accept: 'application/json',
         'Content-Type': 'application/json'
      },
      body: JSON.stringify({
         fields: {
            payload: {
               stringValue: JSON.stringify(state)
            }
         }
      })
   });
   const durationMs = Math.round(nowMs() - started);

   if (response.status === 404) return { ok: false, notFound: true, durationMs };
   if (response.status === 409 || response.status === 412) return { ok: false, conflict: true, durationMs };
   if (response.status === 400) {
      const errorMessage = await parseFirestoreErrorMessage(response);
      if (isPreconditionConflict(errorMessage)) {
         return { ok: false, conflict: true, durationMs, errorMessage };
      }
      return { ok: false, status: 400, durationMs, errorMessage };
   }
   if (!response.ok) {
      const errorMessage = await parseFirestoreErrorMessage(response);
      return { ok: false, status: response.status, durationMs, errorMessage };
   }

   const doc = await response.json();
   return { ok: true, updateTime: doc.updateTime || null, durationMs };
};
