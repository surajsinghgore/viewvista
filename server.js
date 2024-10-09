const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { PeerServer } = require("peer");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// CORS setup
app.use(
  cors({
    origin: "https://viewvista.onrender.com", // Your specific domain
    methods: ["GET", "POST"],
  })
);

// PeerJS server on the same port as Express
const peerServer = PeerServer({
  server, // Use the existing server instead of creating a new one
  path: "/peerjs", // Path for PeerJS
});

// Serve static files from React app (client/build folder)
app.use(express.static(path.join(__dirname, "client/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

// Handle socket.io connections
io.on("connection", (socket) => {
  console.log("A user connected");

  let currentRoom = null;
  let currentUserName = "";

  // Listen for users joining a room
  socket.on("join-room", (roomId, userId, userName) => {
    console.log(`${userName} joined room ${roomId}`);
    
    if (roomId && userId && userName) {
      currentRoom = roomId;
      currentUserName = userName;
      socket.join(roomId);

      // Notify other users
      socket.to(roomId).emit("user-connected", { userId, userName });

      // Update viewer count
      const viewerCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      io.to(roomId).emit("viewer-count", viewerCount);

      // Listen for chat messages
      socket.on("chat-message", (data) => {
        // Emit chat message to all users in the room
        io.to(currentRoom).emit("chat-message", {
          message: data.message,
          userName: currentUserName,
        });
      });

      // Handle user disconnect
      socket.on("disconnect", () => {
        console.log(`${currentUserName} disconnected from room ${currentRoom}`);
        socket.to(currentRoom).emit("user-disconnected", { userId, userName: currentUserName });

        // Update viewer count
        const updatedViewerCount = io.sockets.adapter.rooms.get(currentRoom)?.size || 0;
        io.to(currentRoom).emit("viewer-count", updatedViewerCount);
      });
    } else {
      console.log("Invalid roomId, userId, or userName.");
    }
  });

  // Listening for stream start requests
  socket.on("start-stream", (roomId) => {
    console.log(`Stream started in room: ${roomId}`);
    if (roomId) {
      socket.to(roomId).emit("stream-started");
    } else {
      console.log("Stream start failed: Invalid roomId");
    }
  });
});

// Use the Render-assigned PORT or default to 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
