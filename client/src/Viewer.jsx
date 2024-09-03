import React, { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import io from "socket.io-client";

const Viewer = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [roomId, setRoomId] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [remainingTime, setRemainingTime] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const remoteVideoRef = useRef(null);
  const playButtonRef = useRef(null);
  const peer = useRef(null);

  useEffect(() => {
    if (!isInitialized) return;

    const socketInstance = io("http://localhost:3001", {
      transports: ["websocket"],
      cors: {
        origin: "http://localhost:3000",
      },
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
    });

    setSocket(socketInstance);

    peer.current = new Peer(undefined, {
      path: "/peerjs",
      host: "/",
      port: "9001",
    });

    peer.current.on("call", (call) => {
      call.answer();
      call.on("stream", (userVideoStream) => {
        console.log("Received stream from broadcaster:", userVideoStream);

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = userVideoStream;

          // Start recording the received stream
          const recorder = new MediaRecorder(userVideoStream);
          const chunks = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            uploadToCloudinary(blob);
          };
          recorder.start();

          playButtonRef.current.addEventListener("click", () => {
            remoteVideoRef.current
              .play()
              .then(() => {
                console.log("Video started playing");
                playButtonRef.current.style.display = "none";
              })
              .catch((err) => console.error("Error: ", err));
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

    socketInstance.on("chat-message", ({ message, userName }) => {
      setChatMessages((prevMessages) => [...prevMessages, { message, userName }]);
    });

    socketInstance.on("viewer-count", (count) => {
      setViewerCount(count);
    });

    socketInstance.on("remaining-time", (time) => {
      console.log("Remaining time received:", time);
      setRemainingTime(time);
    });

    socketInstance.on("stream-ended", () => {
      alert("The stream has ended.");
      setRemainingTime(null);
    });

    peer.current.on("open", (id) => {
      socketInstance.emit("join-room", roomId, id, viewerName);
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
      if (peer.current) {
        peer.current.destroy();
      }
    };
  }, [isInitialized, roomId, viewerName]);

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
      socket.emit("chat-message", { message, userName: viewerName });
      setMessage("");
    }
  };

  const uploadToCloudinary = (blob) => {
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', 'YOUR_UPLOAD_PRESET');

    fetch('https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/video/upload', {
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

  const formatTime = (seconds) => {
    if (seconds === null) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div>
      {!isInitialized ? (
        <form onSubmit={handleFormSubmit}>
          <h1>Join Stream</h1>
          <div>
            <label>
              Room ID:
              <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} required />
            </label>
          </div>
          <div>
            <label>
              Viewer Name:
              <input type="text" value={viewerName} onChange={(e) => setViewerName(e.target.value)} required />
            </label>
          </div>
          <button type="submit">Join Stream</button>
        </form>
      ) : (
        <>
          <h1>WebRTC Viewer</h1>
          <h2>Room ID: {roomId}</h2>
          <h2>Time Remaining: {formatTime(remainingTime)}</h2>
          <video ref={remoteVideoRef} autoPlay playsInline></video>
          <button ref={playButtonRef}>Play Video</button>
          <div>
            <h2>Chat</h2>
            <div>
              {chatMessages.map((msg, index) => (
                <p key={index}>
                  <strong>{msg.userName}:</strong> {msg.message}
                </p>
              ))}
            </div>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message" />
            <button onClick={sendMessage}>Send</button>
          </div>
          <h2>Viewer Count: {viewerCount}</h2>
        </>
      )}
    </div>
  );
};

export default Viewer;
