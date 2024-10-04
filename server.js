const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { PeerServer } = require("peer");
const cors = require("cors"); // Import cors
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configure CORS to allow requests from https://viewvista.onrender.com
app.use(
  cors({
    origin: "https://viewvista.onrender.com", // Allow React app's origin
    methods: ["GET", "POST"],
  })
);

// Set up PeerJS server
const peerServer = PeerServer({ 
    port: 443, 
    path: "/peerjs",
    cors: {
        origin: "https://viewvista.onrender.com", // Allow requests from your frontend
        methods: ['GET', 'POST']
    }
});
// Serve static files
app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});
// Serve different HTML files based on routes
app.get("/broadcast", (req, res) => {
  res.sendFile(__dirname + "/public/broadcast.html");
});

app.get("/view", (req, res) => {
  res.sendFile(__dirname + "/public/view.html");
});

// Handle socket connections
io.on("connection", (socket) => {
    console.log("A user connected");
  
    let currentRoom = null;
    let currentUserName = ""; // Store user's name
  
    // When a user joins a room
    socket.on("join-room", (roomId, userId, userName) => {
      if (roomId && userId && userName) {
        currentRoom = roomId;
        currentUserName = userName; // Save the user's name
        socket.join(roomId); // Join the specified room
        console.log(`User ${userId} (${userName}) joined room ${roomId}`);
  
        // Notify other users in the room that a new user has connected
        socket.to(roomId).emit("user-connected", { userId, userName });
  
        // Increment the viewer count
        io.to(roomId).emit("viewer-count", io.sockets.adapter.rooms.get(roomId)?.size || 0);
  
        // Handle chat messages
        socket.on("chat-message", (data) => {
          const { message } = data;
          io.to(roomId).emit("chat-message", { message, userName: currentUserName });
        });
  
        // Handle disconnection of users
        socket.on("disconnect", () => {
          console.log(`User ${userId} (${currentUserName}) disconnected`);
          socket.to(roomId).emit("user-disconnected", { userId, userName: currentUserName });
  
          // Decrement the viewer count
          io.to(roomId).emit("viewer-count", io.sockets.adapter.rooms.get(roomId)?.size || 0);
        });
      } else {
        console.error("Room ID, User ID, or User Name is missing");
      }
    });
  
    // Handle stream end signal
    socket.on("end-stream", (roomId) => {
      if (roomId) {
        io.to(roomId).emit("stream-ended");
        console.log(`Stream in room ${roomId} has ended`);
      } else {
        console.error("Room ID is missing for ending stream");
      }
    });
  });

server.listen(3001, () => {
  console.log("Server is running on port 3001");
});