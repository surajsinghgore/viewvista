// src/SocketProvider.js

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

// Create a Context for Socket
const SocketContext = createContext();

// Custom hook to use the Socket context
export const useSocket = () => useContext(SocketContext);

// SocketProvider component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize the socket connection
    const socketInstance = io(process.env.REACT_APP_SOCKET_URL || 'https://viewvista.onrender.com', {
      transports: ['websocket'],
      reconnectionAttempts: 5,  // Number of reconnection attempts
      reconnectionDelay: 1000,   // Delay between reconnection attempts
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setError(null); // Clear error on successful connection
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      setError('Connection failed. Please check your internet connection or try again later.');
    });

    socketInstance.on('reconnect_attempt', () => {
      console.log('Attempting to reconnect...');
      setError('Attempting to reconnect...');
    });

    socketInstance.on('reconnect', (attempt) => {
      console.log(`Reconnected after ${attempt} attempts`);
      setIsConnected(true);
      setError(null); // Clear error on successful reconnection
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      setError('Disconnected. Please check your internet connection.');
    });

    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Emit an event
  const emit = (eventName, ...args) => {
    if (socket) {
      socket.emit(eventName, ...args);
    }
  };

  // Subscribe to an event
  const on = (eventName, callback) => {
    if (socket) {
      socket.on(eventName, callback);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, emit, on, error, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
