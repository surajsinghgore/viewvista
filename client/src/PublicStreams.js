import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const PublicStreams = () => {
  const [broadcasts, setBroadcasts] = useState([]);
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketInstance = io("http://localhost:3001", {
      transports: ["websocket"],
      cors: {
        origin: "http://localhost:3000",
      },
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      socketInstance.emit("get-public-streams");
    });

    socketInstance.on("public-streams", (streams) => {
      setBroadcasts(streams);
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  const handleJoin = (roomId) => {
    navigate(`/view?roomId=${roomId}`); // Redirect to the viewer page with roomId as a query parameter
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Public Streams</h1>
      <div className="space-y-4">
        {broadcasts.map((broadcast) => (
          <div key={broadcast.roomId} className="border p-4 rounded-md shadow-sm">
            <h2 className="text-xl font-semibold">Room ID: {broadcast.roomId}</h2>
            <p className="text-lg">Price per Minute: ${broadcast.pricePerMinute.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Duration: {broadcast.duration} minutes</p>
            <p className="text-sm text-gray-600">Time Remaining: {broadcast.endTime ? Math.max(0, Math.floor((broadcast.endTime - Date.now()) / 1000)) : 'N/A'}</p>
            <button
              onClick={() => handleJoin(broadcast.roomId)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 mt-2"
            >
              Join Stream
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicStreams;
