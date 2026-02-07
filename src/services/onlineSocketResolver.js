export const NETWORK_MODES = Object.freeze({
   LAN: 'lan',
   ONLINE: 'online'
});

const NETWORK_MODE_STORAGE_KEY = 'uno_network_mode';
const SESSION_STORAGE_KEY = 'uno_session';

export const getStoredNetworkMode = () => {
   try {
      const stored = localStorage.getItem(NETWORK_MODE_STORAGE_KEY);
      if (stored === NETWORK_MODES.LAN || stored === NETWORK_MODES.ONLINE) {
         return stored;
      }

      const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (rawSession) {
         const parsed = JSON.parse(rawSession);
         if (parsed?.networkMode === NETWORK_MODES.LAN || parsed?.networkMode === NETWORK_MODES.ONLINE) {
            return parsed.networkMode;
         }
      }
   } catch {
      // ignore storage failures
   }

   return NETWORK_MODES.ONLINE;
};

export const setStoredNetworkMode = (mode) => {
   try {
      localStorage.setItem(NETWORK_MODE_STORAGE_KEY, mode);
   } catch {
      // ignore storage failures
   }
};
