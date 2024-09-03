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
  const [stream, setStream] = useState(null); // State for media stream
  const [isPaused, setIsPaused] = useState(false); // State for stream status
  const localVideoRef = useRef(null);
  const peer = useRef(null);

  const sendMessage = () => {
    if (message) {
      socket.emit('chat-message', { message, userName: streamerName });
      setMessage('');
    }
  };

  const endStream = () => {
    if (roomId) {
      socket.emit('end-stream', roomId);
    }
    stopMediaStream(); // Stop the media stream
  };

  const stopMediaStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop()); // Stop all tracks
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null; // Clear the video source
      }
      setStream(null); // Clear stream state
      setIsPaused(false); // Reset pause state
    }
  };

  const togglePausePlay = () => {
    if (stream) {
      const isPausedNow = !isPaused;
      setIsPaused(isPausedNow);
      
      // Pause or resume the media stream
      stream.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.enabled = !isPausedNow;
        }
      });

      // Update the video element
      if (localVideoRef.current) {
        localVideoRef.current.play();
      }
    }
  };

  useEffect(() => {
    if (!isInitialized) return;

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
    }).then(userStream => {
      setStream(userStream); // Save the media stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = userStream; // Assign the stream to the video element
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current.play(); // Ensure video is playing once metadata is loaded
        };
      }

      peer.current.on('call', call => {
        call.answer(userStream);
        call.on('stream', userVideoStream => {
          console.log("Received stream from user");
        });
      });

      socketInstance.on('user-connected', ({ userId, userName }) => {
        connectToNewUser(userId, userStream);
      });

      socketInstance.on('chat-message', ({ message, userName }) => {
        setChatMessages(prevMessages => [...prevMessages, { message, userName }]);
      });

      socketInstance.on('viewer-count', count => {
        setViewerCount(count);
      });

      socketInstance.on('stream-ended', () => {
        alert('The stream has ended.');
        stopMediaStream(); // Stop the media stream when the stream ends
      });
    }).catch(err => {
      console.error("Error accessing media devices:", err);
    });

    peer.current.on('open', id => {
      socketInstance.emit('join-room', roomId, id, streamerName);
    });

    const connectToNewUser = (userId, userStream) => {
      const call = peer.current.call(userId, userStream);
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
      stopMediaStream(); // Ensure stream is stopped on cleanup
    };
  }, [isInitialized, roomId, streamerName]);

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
          <h2>Room ID: {roomId}</h2>
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
          <button onClick={endStream}>End Stream</button>
          <button onClick={togglePausePlay}>
            {isPaused ? 'Resume Stream' : 'Pause Stream'}
          </button>
        </>
      )}
    </div>
  );
};

export default Broadcast;
