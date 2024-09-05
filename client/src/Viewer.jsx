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
  const [remainingTime, setRemainingTime] = useState(null); // State for remaining time
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

  const formatTime = (seconds) => {
    if (seconds === null) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex">
      <div className="flex-1 p-4">
        {!isInitialized ? (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <h1 className="text-2xl font-bold">Join Stream</h1>
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
                Viewer Name:
                <input
                  type="text"
                  value={viewerName}
                  onChange={(e) => setViewerName(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
              </label>
            </div>
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
              Join Stream
            </button>
          </form>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4">WebRTC Viewer</h1>
            <div className="flex">
              <div className="flex-1">
                <h2 className="text-xl font-semibold">Room ID: {roomId}</h2>
                <h2 className="text-xl font-semibold">Time Remaining: {formatTime(remainingTime)}</h2>
                <video ref={remoteVideoRef} autoPlay playsInline className="w-[100vw] border rounded-md h-[400px]"></video>
                <button ref={playButtonRef} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 mt-4">
                  Play Video
                </button>
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

export default Viewer;