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
  const [duration, setDuration] = useState(0); // State for duration
  const [remainingTime, setRemainingTime] = useState(0); // State for countdown
  const [isInitialized, setIsInitialized] = useState(false);
  const [stream, setStream] = useState(null); // State for media stream
  const [isPaused, setIsPaused] = useState(false); // State for stream status
  const localVideoRef = useRef(null);
  const peer = useRef(null);
  const socketRef = useRef(null); // Ref for socket instance
  const timerRef = useRef(null); // Ref for countdown timer

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
    if (timerRef.current) {
      clearInterval(timerRef.current); // Clear the countdown timer
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

    socketRef.current = io('http://localhost:3001', {
      transports: ['websocket'],
      cors: {
        origin: 'http://localhost:3000',
      },
    });

    const socketInstance = socketRef.current;

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

      // Countdown timer
      if (duration > 0) {
        const endTime = Date.now() + duration * 60000; // Duration in milliseconds
        timerRef.current = setInterval(() => {
          const timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
          setRemainingTime(timeLeft);

          if (timeLeft === 0) {
            endStream(); // End the stream when countdown reaches 0
          }
        }, 1000);
      }
    }).catch(err => {
      console.error("Error accessing media devices:", err);
    });

    peer.current.on('open', id => {
      if (socketInstance) {
        socketInstance.emit('join-room', roomId, id, streamerName);
      }
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
    <div className="flex">
    <div className="flex-1 p-4">
      {!isInitialized ? (
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <h1 className="text-2xl font-bold">Set Up Your Broadcast</h1>
          <div>
            <label className="block text-sm font-medium">
              Room ID:
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Streamer Name:
              <input
                type="text"
                value={streamerName}
                onChange={(e) => setStreamerName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Duration (minutes):
              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              />
            </label>
          </div>
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
            Start Broadcast
          </button>
        </form>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-4">WebRTC Broadcaster</h1>
          <div className="flex">
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Room ID: {roomId}</h2>
              <h2 className="text-xl font-semibold">Time Remaining: {formatTime(remainingTime)}</h2>
              <video ref={localVideoRef} autoPlay muted className="w-[100vw] border rounded-md h-[400px]"></video>
              <div className="mt-4">
                <button onClick={endStream} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">
                  End Stream
                </button>
                <button onClick={togglePausePlay} className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 ml-2">
                  {isPaused ? 'Resume Stream' : 'Pause Stream'}
                </button>
              </div>
            </div>
            <div className="w-1/3 bg-gray-100 p-4 border-l">
              <h2 className="text-xl font-semibold mb-2">Chat</h2>
              <div className="h-80 overflow-y-auto mb-4">
                {chatMessages.map((msg, index) => (
                  <p key={index} className="mb-2">
                    <strong>{msg.userName}:</strong> {msg.message}
                  </p>
                ))}
              </div>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              />
              <button onClick={sendMessage} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 mt-2">
                Send
              </button>
              <h2 className="text-xl font-semibold mt-4">Viewer Count: {viewerCount}</h2>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
  );
};

export default Broadcast;