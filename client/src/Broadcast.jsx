// src/components/Broadcast.jsx

import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const Broadcast = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const localVideoRef = useRef(null);
  const peer = useRef(null);

  // Define sendMessage function outside of useEffect
  const sendMessage = () => {
    if (message) {
      socket.emit('chat-message', message);
      setMessage('');
    }
  };

  useEffect(() => {
    const socketInstance = io('http://localhost:3001', {
      transports: ['websocket'],
      cors: {
        origin: 'http://localhost:3000',
      },
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
    });

    setSocket(socketInstance);

    peer.current = new Peer(undefined, {
      path: '/peerjs',
      host: '/',
      port: '9001',
    });

    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    }).then(stream => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      peer.current.on('call', call => {
        call.answer(stream);
        call.on('stream', userVideoStream => {
          console.log("Received stream from user");
        });
      });

      socketInstance.on('user-connected', userId => {
        connectToNewUser(userId, stream);
      });

      socketInstance.on('chat-message', message => {
        setChatMessages(prevMessages => [...prevMessages, message]);
      });

      socketInstance.on('viewer-count', count => {
        setViewerCount(count);
      });
    }).catch(err => console.error("Error: ", err));

    peer.current.on('open', id => {
      const roomId = prompt('Enter Room ID');
      socketInstance.emit('join-room', roomId, id);
    });

    const connectToNewUser = (userId, stream) => {
      const call = peer.current.call(userId, stream);
      call.on('stream', userVideoStream => {
        console.log("Connected to user", userId);
      });
    };

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
      if (peer.current) {
        peer.current.destroy();
      }
    };
  }, []); // Empty dependency array to run only once

  return (
    <div>
      <h1>WebRTC Broadcaster</h1>
      <video ref={localVideoRef} autoPlay muted></video>
      <div>
        <h2>Chat</h2>
        <div>
          {chatMessages.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={sendMessage}>Send</button>
      </div>
      <h2>Viewer Count: {viewerCount}</h2>
    </div>
  );
};

export default Broadcast;
