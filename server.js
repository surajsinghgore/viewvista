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
    origin: "https://viewvista-client.onrender.com",
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
        if (!file || file.size === 0) {
            return res.status(400).json({ error: 'Empty file' });
        }

        cloudinary.uploader.upload_stream({ resource_type: 'video' }, (error, result) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json({ url: result.secure_url });
        }).end(file.buffer);
    } catch (error) {
        console.log("err = "+error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Maintain a list of active public streams
const activePublicStreams = new Map();

// Handle socket connections
io.on("connection", (socket) => {
    console.log("A user connected");

    let currentRoom = null;
    let currentUserName = ""; // Store user's name
    let countdownInterval = null; // To hold the countdown interval
    let pricePerMinute = 0; // Store the price per minute
    let visibility = 'public'; // Store visibility setting

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

    // Handle broadcast creation with price and visibility
    socket.on("start-stream", (roomId, duration, price, visibilitySetting) => {
        if (roomId && duration > 0 && price >= 0) {
            const endTime = Date.now() + duration * 60000; // Duration in milliseconds
            pricePerMinute = price; // Set the price per minute
            visibility = visibilitySetting || 'public'; // Set visibility setting

            // Add to active public streams if visibility is public
            if (visibility === 'public') {
                activePublicStreams.set(roomId, {
                    pricePerMinute,
                    duration,
                    endTime,
                    visibility
                });
            } else {
                activePublicStreams.delete(roomId);
            }

            // Emit price per minute and visibility to clients
            io.to(roomId).emit("price-per-minute", pricePerMinute);
            io.to(roomId).emit("stream-visibility", visibility);

            // Emit remaining time every second
            countdownInterval = setInterval(() => {
                const timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
                io.to(roomId).emit("remaining-time", timeLeft);

                if (timeLeft === 0) {
                    clearInterval(countdownInterval);
                    io.to(roomId).emit("stream-ended");
                    activePublicStreams.delete(roomId); // Remove from public streams list
                }
            }, 1000);

            console.log(`Stream started in room ${roomId} with duration ${duration} minutes, price per minute ${pricePerMinute}, and visibility ${visibility}`);
        } else {
            console.error("Room ID, duration, or price is missing for starting the stream");
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
            activePublicStreams.delete(roomId); // Remove from public streams list
            console.log(`Stream in room ${roomId} has ended`);
        } else {
            console.error("Room ID is missing for ending stream");
        }
    });

    // Handle request for public streams
    socket.on("get-public-streams", () => {
        socket.emit("public-streams", Array.from(activePublicStreams.entries()).map(([roomId, details]) => ({
            roomId,
            ...details
        })));
    });
});

server.listen(3001, () => {
    console.log("Server is running on port 3001");
});
