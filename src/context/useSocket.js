import { useContext } from 'react';
import { SocketContext } from './socketContextValue';

export const useSocket = () => useContext(SocketContext).socket;

export const useSocketControls = () => {
   const {
      networkMode,
      setNetworkMode,
      resolvedSocketUrl,
      isResolvingNetwork,
      onlineSocketUrlInput,
      setOnlineSocketUrl
   } = useContext(SocketContext);

   return {
      networkMode,
      setNetworkMode,
      resolvedSocketUrl,
      isResolvingNetwork,
      onlineSocketUrlInput,
      setOnlineSocketUrl
   };
};
