import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const Viewer = () => {
  const videoRef = useRef();
  const socketRef = useRef();
  const peerConnection = useRef(new RTCPeerConnection());

  useEffect(() => {
    socketRef.current = io.connect('http://localhost:4000');

    socketRef.current.emit('watcher');

    socketRef.current.on('offer', (id, description) => {
      const remoteDesc = new RTCSessionDescription(description);
      peerConnection.current.setRemoteDescription(remoteDesc).then(() => {
        return peerConnection.current.createAnswer();
      }).then((sdp) => {
        return peerConnection.current.setLocalDescription(sdp);
      }).then(() => {
        socketRef.current.emit('answer', id, peerConnection.current.localDescription);
      }).catch((e) => console.error('Error setting remote description or creating answer:', e));
    });

    socketRef.current.on('candidate', (id, candidate) => {
      const rtcCandidate = new RTCIceCandidate(candidate);
      peerConnection.current.addIceCandidate(rtcCandidate)
        .catch((e) => console.error('Error adding received ice candidate:', e));
    });

    peerConnection.current.ontrack = (event) => {
      videoRef.current.srcObject = event.streams[0];
    };

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return <video ref={videoRef} autoPlay />;
};

export default Viewer;
