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
  const [duration, setDuration] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recording, setRecording] = useState(false);

  const localVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null); // Ref for MediaRecorder
  const streamRef = useRef(null); // Ref for MediaStream

  const sendMessage = () => {
    if (message && socket) {
      socket.emit('chat-message', { message, userName: streamerName });
      setMessage('');
    }
  };

  const endStream = () => {
    if (roomId && socket) {
      socket.emit('end-stream', roomId);
    }
    stopRecording();
  };



  const uploadToServer = (blob) => {
    console.log('Uploading to server...');
    const formData = new FormData();
    formData.append('file', blob, 'livestream.webm');

    fetch('http://localhost:3001/upload', {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        console.log('Upload successful:', data);
      })
      .catch(error => {
        console.error('Upload error:', error);
      });
  };

  const startRecording = () => {
    if (mediaRecorderRef.current || !streamRef.current) {
      console.warn('Recording already in progress or no stream available.');
      return;
    }

    const options = { mimeType: 'video/webm; codecs=vp9' };
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          uploadToServer(event.data);
        }
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setRecording(false);
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

    setSocket(socketInstance);

    const peer = new Peer(undefined, {
      path: '/peerjs',
      host: '/',
      port: '9001',
    });

    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    }).then(stream => {
      streamRef.current = stream; // Store the stream for recording

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      peer.on('open', id => {
        if (socketInstance) {
          socketInstance.emit('join-room', roomId, id, streamerName);
        }
      });

      socketInstance.on('user-connected', ({ userId, userName }) => {
        // Handle user connection
      });

      socketInstance.on('chat-message', ({ message, userName }) => {
        setChatMessages(prevMessages => [...prevMessages, { message, userName }]);
      });

      socketInstance.on('viewer-count', count => {
        setViewerCount(count);
      });

      socketInstance.on('stream-ended', () => {
        alert('The stream has ended.');
        endStream();
      });

      if (duration > 0) {
        const endTime = Date.now() + duration * 60000;
        const timer = setInterval(() => {
          const timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
          setRemainingTime(timeLeft);

          if (timeLeft === 0) {
            endStream();
          }
        }, 1000);

        return () => clearInterval(timer);
      }

      return () => {
        if (socketInstance) {
          socketInstance.disconnect();
        }
        if (peer) {
          peer.destroy();
        }
        stopRecording();
      };
    }).catch(err => {
      console.error('Error accessing media devices:', err);
    });

  }, [isInitialized, roomId, streamerName, duration]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (roomId && streamerName && duration > 0) {
      setIsInitialized(true);
      
    } else {
      alert("Please enter Room ID, Streamer Name, and Duration");
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
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
          <div>
            <label>
              Duration (minutes):
              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
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
          <h2>Time Remaining: {formatTime(remainingTime)}</h2>

          <video ref={localVideoRef} autoPlay muted />

          {recording ? (
            <button onClick={stopRecording}>End Stream</button>
          ) : (
            <button onClick={startRecording}>Start Recording</button>
          )}

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
