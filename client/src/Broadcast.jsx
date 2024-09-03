import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const Broadcast = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [roomId, setRoomId] = useState('');
  const [streamerName, setStreamerName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const localVideoRef = useRef(null);
  const peer = useRef(null);

  // Define sendMessage function outside of useEffect
  const sendMessage = () => {
    if (message) {
      socket.emit('chat-message', { message, userName: streamerName });
      setMessage('');
    }
  };

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

      socketInstance.on('user-connected', ({ userId, userName }) => {
        connectToNewUser(userId, stream);
      });

      socketInstance.on('chat-message', ({ message, userName }) => {
        setChatMessages(prevMessages => [...prevMessages, { message, userName }]);
      });

      socketInstance.on('viewer-count', count => {
        setViewerCount(count);
      });
    }).catch(err => console.error("Error: ", err));

    peer.current.on('open', id => {
      socketInstance.emit('join-room', roomId, id, streamerName);
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
  }, [isInitialized, roomId, streamerName]); // Dependency array now includes isInitialized, roomId, and streamerName

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (roomId && streamerName) {
      setIsInitialized(true);
    } else {
      alert("Please enter both Room ID and Streamer Name");
    }
  };

  return (
    <div>
      {!isInitialized ? (
        <form onSubmit={handleFormSubmit}>
          <h1>Set Up Your Broadcast</h1>
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
              Streamer Name:
              <input
                type="text"
                value={streamerName}
                onChange={(e) => setStreamerName(e.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit">Start Broadcast</button>
        </form>
      ) : (
        <>
          <h1>WebRTC Broadcaster</h1>
          <h2>Room ID: {roomId}</h2> {/* Display Room ID */}
          <video ref={localVideoRef} autoPlay muted></video>
          <div>
            <h2>Chat</h2>
            <div>
              {chatMessages.map((msg, index) => (
                <p key={index}><strong>{msg.userName}:</strong> {msg.message}</p>
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
        </>
      )}
    </div>
  );
};

export default Broadcast;
