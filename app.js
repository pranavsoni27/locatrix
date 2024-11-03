const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Setting EJS as the view engine
app.set("view engine", "ejs");

// Serving static files (CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Socket.io for handling real-time connections
io.on("connection", (socket) => {
    // Event listener for receiving location data from a client
    socket.on("send-location", (data) => {
        io.emit("receive-location", { id: socket.id, ...data });
    });

    // Notify others when a user disconnects
    socket.on("disconnect", () => {
        io.emit("user-disconnected", socket.id);
    });
});

// Render the main page
app.get("/", (req, res) => {
    res.render("index");
});

// Start the server
server.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});