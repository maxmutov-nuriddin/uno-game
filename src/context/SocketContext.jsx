import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createFirebaseSocket } from '../services/firebaseSocket';
import { NETWORK_MODES, getStoredNetworkMode, setStoredNetworkMode } from '../services/onlineSocketResolver';
import { SocketContext } from './socketContextValue';

export const SocketProvider = ({ children }) => {
   const [networkMode, setNetworkModeState] = useState(() => getStoredNetworkMode());

   useEffect(() => {
      setStoredNetworkMode(networkMode);
   }, [networkMode]);

   const socket = useMemo(() => createFirebaseSocket(), []);

   useEffect(() => {
      return () => {
         socket.close();
      };
   }, [socket]);

   const setNetworkMode = useCallback((nextMode) => {
      if (nextMode !== NETWORK_MODES.LAN && nextMode !== NETWORK_MODES.ONLINE) return;
      setNetworkModeState(nextMode);
   }, []);

   const setOnlineSocketUrl = useCallback(() => '', []);

   return (
      <SocketContext.Provider
         value={{
            socket,
            networkMode,
            setNetworkMode,
            resolvedSocketUrl: 'firebase',
            isResolvingNetwork: false,
            onlineSocketUrlInput: '',
            setOnlineSocketUrl
         }}
      >
         {children}
      </SocketContext.Provider>
   );
};
