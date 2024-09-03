import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const Viewer = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0); // Add state for viewer count
  const [roomId, setRoomId] = useState('');
  const [viewerName, setViewerName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const remoteVideoRef = useRef(null);
  const playButtonRef = useRef(null);
  const peer = useRef(null);

  useEffect(() => {
    if (!isInitialized) return; // Ensure initialization only happens after form submission

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

    socketInstance.on('chat-message', message => {
      setChatMessages(prevMessages => [...prevMessages, message]);
    });

    socketInstance.on('viewer-count', count => {
      setViewerCount(count);
    });

    peer.current.on('open', id => {
      socketInstance.emit('join-room', roomId, id, viewerName);
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
      if (peer.current) {
        peer.current.destroy();
      }
    };
  }, [isInitialized, roomId, viewerName]); // Dependency array includes isInitialized, roomId, and viewerName

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (roomId && viewerName) {
      setIsInitialized(true);
    } else {
      alert("Please enter both Room ID and Viewer Name");
    }
  };

  const sendMessage = () => {
    if (message) {
      socket.emit('chat-message', message);
      setMessage('');
    }
  };

  return (
    <div>
      {!isInitialized ? (
        <form onSubmit={handleFormSubmit}>
          <h1>Join Stream</h1>
          <div>
            <label>
              Room ID:
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Viewer Name:
              <input
                type="text"
                value={viewerName}
                onChange={(e) => setViewerName(e.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit">Join Stream</button>
        </form>
      ) : (
        <>
          <h1>WebRTC Viewer</h1>
          <h2>Room ID: {roomId}</h2> {/* Display Room ID */}
          <video ref={remoteVideoRef} autoPlay playsInline></video>
          <button ref={playButtonRef}>Play Video</button>
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
          <h2>Viewer Count: {viewerCount}</h2> {/* Display viewer count */}
        </>
      )}
    </div>
  );
};

export default Viewer;
