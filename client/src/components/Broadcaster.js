import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const Broadcaster = () => {
  const videoRef = useRef();
  const socketRef = useRef();
  const peerConnections = {};

  useEffect(() => {
    socketRef.current = io.connect('http://localhost:4000');

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      videoRef.current.srcObject = stream;
      socketRef.current.emit('broadcaster');

      socketRef.current.on('watcher', (id) => {
        const peerConnection = new RTCPeerConnection();
        peerConnections[id] = peerConnection;

        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit('candidate', id, event.candidate);
          }
        };

        peerConnection.createOffer().then((sdp) => {
          peerConnection.setLocalDescription(sdp);
          socketRef.current.emit('offer', id, peerConnection.localDescription);
        });
      });

      socketRef.current.on('answer', (id, description) => {
        const remoteDesc = new RTCSessionDescription(description);
        peerConnections[id].setRemoteDescription(remoteDesc)
          .catch((e) => console.error('Error setting remote description:', e));
      });

      socketRef.current.on('candidate', (id, candidate) => {
        const rtcCandidate = new RTCIceCandidate(candidate);
        peerConnections[id].addIceCandidate(rtcCandidate)
          .catch((e) => console.error('Error adding received ice candidate:', e));
      });

      socketRef.current.on('disconnectPeer', (id) => {
        if (peerConnections[id]) {
          peerConnections[id].close();
          delete peerConnections[id];
        }
      });
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return <video ref={videoRef} autoPlay muted />;
};

export default Broadcaster;
