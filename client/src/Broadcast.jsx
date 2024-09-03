// src/components/Broadcast.jsx

import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const Broadcast = () => {
  const [socket, setSocket] = useState(null);
  const localVideoRef = useRef(null);
  const peer = useRef(null);

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
  }, []);

  return (
    <div>
      <h1>WebRTC Broadcaster</h1>
      <video ref={localVideoRef} autoPlay muted></video>
    </div>
  );
};

export default Broadcast;
