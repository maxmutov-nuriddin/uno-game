import { createContext } from 'react';
import { NETWORK_MODES } from '../services/onlineSocketResolver';

export const SocketContext = createContext({
   socket: null,
   networkMode: NETWORK_MODES.LAN,
   setNetworkMode: () => {},
   resolvedSocketUrl: '',
   isResolvingNetwork: false,
   onlineSocketUrlInput: '',
   setOnlineSocketUrl: () => {}
});
