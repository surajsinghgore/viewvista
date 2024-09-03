const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { PeerServer } = require("peer");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Cloudinary configuration
cloudinary.config({
  cloud_name: 'dnxv21hr0',
  api_key: '792554459657294',
  api_secret: 'uoJrUw66jZIJ9cpfBaUfkTdAJK4',
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configure CORS to allow requests from http://localhost:3000
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  })
);

// Set up PeerJS server
const peerServer = PeerServer({ port: 9001, path: "/peerjs" });

// Serve static files
app.use(express.static("public"));

// Serve different HTML files based on routes
app.get("/broadcast", (req, res) => {
  res.sendFile(__dirname + "/public/broadcast.html");
});

app.get("/view", (req, res) => {
  res.sendFile(__dirname + "/public/view.html");
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Handle file upload and save to Cloudinary
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        
   
    const file = req.file;
  console.log(file)
    if (!file || file.size === 0) {
      return res.status(400).json({ error: 'Empty file' });
    }
  
    console.log(req.file);
  
    cloudinary.uploader.upload_stream({ resource_type: 'video' }, (error, result) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
  
      res.json({ url: result.secure_url });
    }).end(file.buffer);
} catch (error) {
        console.log("err = "+error)
}
  });
  
  
// Handle socket connections
io.on("connection", (socket) => {
  console.log("A user connected");

  let currentRoom = null;
  let currentUserName = ""; // Store user's name
  let countdownInterval = null; // To hold the countdown interval

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

  // Handle stream start
  socket.on("start-stream", (roomId, duration) => {
    if (roomId && duration > 0) {
      const endTime = Date.now() + duration * 60000; // Duration in milliseconds

      // Emit remaining time every second
      countdownInterval = setInterval(() => {
        const timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        io.to(roomId).emit("remaining-time", timeLeft);

        if (timeLeft === 0) {
          clearInterval(countdownInterval);
          io.to(roomId).emit("stream-ended");
        }
      }, 1000);

      console.log(`Stream started in room ${roomId} with duration ${duration} minutes`);
    } else {
      console.error("Room ID or duration is missing for starting the stream");
    }
  });

  // Handle stream end signal
  socket.on("end-stream", (roomId) => {
    if (roomId) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
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
