import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

// Change this to your server IP for actual LAN, for localhost testing use localhost
// For LAN usage, user must know the server IP.
// Simplification: We assume localhost for now or window.location.hostname
const SOCKET_URL = `http://${window.location.hostname}:3000`;

export const SocketProvider = ({ children }) => {
   const [socket, setSocket] = useState(null);

   useEffect(() => {
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);
      return () => newSocket.close();
   }, []);

   return (
      <SocketContext.Provider value={socket}>
         {children}
      </SocketContext.Provider>
   );
};
