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
  const [pricePerMinute, setPricePerMinute] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const remoteVideoRef = useRef(null);
  const peer = useRef(null);

  useEffect(() => {
    if (!isInitialized) return;

    // Set up socket connection to the deployed domain
    const socketInstance = io('https://viewvista.onrender.com', {
      transports: ['websocket'],
      cors: {
        origin: 'https://viewvista.onrender.com',
      },
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
    });

    setSocket(socketInstance);

    // Configure PeerJS with the deployed host and secure settings
    peer.current = new Peer(undefined, {
      path: "/",
      host: "peerjs.com",
      port: 443,
      secure: true,
    });

    // Listen for incoming calls
    peer.current.on("call", (call) => {
      console.log("Incoming call...");
      call.answer(); // Answer the call
      call.on("stream", (userVideoStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = userVideoStream; // Set remote video stream
        }
      });
    });

    // Listen for chat messages from the server
    socketInstance.on("chat-message", ({ message, userName }) => {
      setChatMessages((prevMessages) => [...prevMessages, { message, userName }]);
    });

    // Update viewer count
    socketInstance.on("viewer-count", (count) => {
      setViewerCount(count);
    });

    // Update remaining time
    socketInstance.on("remaining-time", (time) => {
      setRemainingTime(time);
    });

    // Handle stream end event
    socketInstance.on("stream-ended", () => {
      alert("The stream has ended.");
      setRemainingTime(null);
    });

    // Receive price per minute
    socketInstance.on("price-per-minute", (price) => {
      setPricePerMinute(price);
    });

    // Emit join-room event when the peer connection is established
    peer.current.on("open", (id) => {
      console.log(`Peer connection established with ID: ${id}`);
      socketInstance.emit("join-room", roomId, id, viewerName);
      socketInstance.emit("start-stream", roomId); // Emit start stream
    });

    return () => {
      // Cleanup on component unmount
      if (socketInstance) {
        socketInstance.disconnect();
      }
      if (peer.current) {
        peer.current.destroy();
      }
    };
  }, [isInitialized, roomId, viewerName]);

  const formatTime = (seconds) => {
    if (seconds === null) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (roomId && viewerName) {
      setIsInitialized(true); // Initialize viewer once room ID and name are provided
    } else {
      alert("Please enter both Room ID and Viewer Name");
    }
  };

  const sendMessage = () => {
    if (message) {
      socket.emit("chat-message", { message, userName: viewerName }); // Send chat message
      setMessage(""); // Clear message input
    }
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
                <h2 className="text-xl font-semibold">Price per Minute: ${pricePerMinute.toFixed(2)}</h2>
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full border rounded-md h-[400px]"></video>
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
