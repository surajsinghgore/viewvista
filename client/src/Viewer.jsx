// src/components/Viewer.jsx

import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const Viewer = () => {
  const [socket, setSocket] = useState(null);
  const remoteVideoRef = useRef(null);
  const playButtonRef = useRef(null);
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

    peer.current.on('call', call => {
      call.answer(); // Answer the call without sending media
      call.on('stream', userVideoStream => {
        console.log("Received stream from broadcaster:", userVideoStream);

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = userVideoStream;

          playButtonRef.current.addEventListener('click', () => {
            remoteVideoRef.current.play().then(() => {
              console.log("Video started playing");
              playButtonRef.current.style.display = 'none';
            }).catch(err => console.error("Error: ", err));
          });

          remoteVideoRef.current.onloadedmetadata = () => {
            console.log("Video metadata loaded");
          };

          remoteVideoRef.current.onerror = (e) => {
            console.error("Video error:", e);
          };
        }
      });
    });

    socketInstance.on('user-connected', userId => {
      console.log(`User connected: ${userId}`);
    });

    peer.current.on('open', id => {
      const roomId = prompt('Enter Room ID');
      socketInstance.emit('join-room', roomId, id);
    });

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
      <h1>WebRTC Viewer</h1>
      <video ref={remoteVideoRef} autoPlay playsInline></video>
      <button ref={playButtonRef}>Play Video</button>
    </div>
  );
};

export default Viewer;
