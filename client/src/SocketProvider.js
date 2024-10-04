// src/SocketProvider.js

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

// Create a Context for Socket
const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketInstance = io('https://viewvista.onrender.com', {
  transports: ['websocket'],
  cors: {
    origin: 'https://viewvista.onrender.com',
  },
});
    socketInstance.on('connect', () => {
      console.log('Socket connected');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};