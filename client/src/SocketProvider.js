// src/SocketProvider.js

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

// Create a Context for Socket
const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize the socket connection
    const socketInstance = io('https://viewvista.onrender.com', {
    transports: ['websocket'],
  });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(socketInstance);

    // Clean up on unmount
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
