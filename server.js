const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { PeerServer } = require("peer");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(
  cors({
    origin: "*", // For production, replace "*" with your frontend's domain.
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

  socket.on("join-room", (roomId, userId, userName) => {
    console.log("user joined");
    if (roomId && userId && userName) {
      currentRoom = roomId;
      currentUserName = userName;
      socket.join(roomId);

      // Notify other users
      socket.to(roomId).emit("user-connected", { userId, userName });

      // Update viewer count
      io.to(roomId).emit("viewer-count", io.sockets.adapter.rooms.get(roomId)?.size || 0);

      socket.on("disconnect", () => {
        socket.to(roomId).emit("user-disconnected", { userId, userName: currentUserName });
        io.to(roomId).emit("viewer-count", io.sockets.adapter.rooms.get(roomId)?.size || 0);
      });
    }
  });
});

// Use the Render-assigned PORT or default to 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
