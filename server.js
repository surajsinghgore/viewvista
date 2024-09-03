const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { PeerServer } = require('peer');
const cors = require('cors'); // Import cors

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configure CORS to allow requests from http://localhost:3000
app.use(cors({
  origin: 'http://localhost:3000', // Allow React app's origin
  methods: ['GET', 'POST'],
}));

// Set up PeerJS server
const peerServer = PeerServer({ port: 9001, path: '/peerjs' });

// Serve static files
app.use(express.static('public'));

// Serve different HTML files based on routes
app.get('/broadcast', (req, res) => {
  res.sendFile(__dirname + '/public/broadcast.html');
});

app.get('/view', (req, res) => {
  res.sendFile(__dirname + '/public/view.html');
});

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // When a user joins a room
  socket.on('join-room', (roomId, userId) => {
    if (roomId && userId) {
      socket.join(roomId); // Join the specified room
      console.log(`User ${userId} joined room ${roomId}`);

      // Notify other users in the room that a new user has connected
      socket.to(roomId).emit('user-connected', userId);

      // Handle disconnection of users
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);
        socket.to(roomId).emit('user-disconnected', userId);
      });
    } else {
      console.error("Room ID or User ID is missing");
    }
  });
});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
