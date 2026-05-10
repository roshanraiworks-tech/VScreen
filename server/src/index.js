import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { Server } from "socket.io";

import roomRoutes from "./routes/roomRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import {
    addMember,
    addMessage,
    getRoom,
    removeMember,
    setCurrentMedia,
    setPlaybackState,
} from "./data/rooms.js";
import { adminAuth } from "./config/firebaseAdmin.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

app.set("io", io);

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Virtual Screen backend is running",
    });
});

app.use("/api/rooms", roomRoutes);
app.use("/api/uploads", uploadRoutes);

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Unauthorized"));
        }

        const decodedToken = await adminAuth.verifyIdToken(token);
        socket.user = decodedToken;
        next();
    } catch (error) {
        next(new Error("Unauthorized"));
    }
});

const emitRoomState = (roomId) => {
    const room = getRoom(roomId);
    if (!room) return;

    io.to(roomId).emit("room:state", {
        roomId,
        members: room.members,
        hostSocketId: room.hostSocketId,
        messages: room.messages,
        media: room.media,
        currentMedia: room.currentMedia,
        playbackState: room.playbackState,
    });
};

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.emit("server:connected", {
        socketId: socket.id,
        message: "Connected to Virtual Screen server",
    });

    socket.on("room:join", ({ roomId, userName }) => {
        const room = getRoom(roomId);

        if (!room) {
            socket.emit("room:error", {
                message: "Room not found",
            });
            return;
        }

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.userName =
            userName || socket.user.email || socket.user.name || "Guest";

        addMember(roomId, {
            socketId: socket.id,
            userName: socket.data.userName,
        });

        const updatedRoom = getRoom(roomId);

        io.to(roomId).emit("room:members", {
            roomId,
            members: updatedRoom.members,
            hostSocketId: updatedRoom.hostSocketId,
        });

        socket.emit("room:joined", {
            roomId,
            room: updatedRoom,
        });
    });

    socket.on("room:leave", ({ roomId }) => {
        const room = getRoom(roomId);
        if (!room) return;

        socket.leave(roomId);
        removeMember(roomId, socket.id);

        const updatedRoom = getRoom(roomId);

        io.to(roomId).emit("room:members", {
            roomId,
            members: updatedRoom.members,
            hostSocketId: updatedRoom.hostSocketId,
        });
    });

    socket.on("room:select-media", ({ roomId, mediaId }) => {
        const room = getRoom(roomId);
        if (!room) return;

        if (room.hostSocketId !== socket.id) {
            socket.emit("room:error", {
                message: "Only the host can select media",
            });
            return;
        }

        const updatedRoom = setCurrentMedia(roomId, mediaId);
        if (!updatedRoom) return;

        io.to(roomId).emit("room:current-media", {
            roomId,
            currentMedia: updatedRoom.currentMedia,
            playbackState: updatedRoom.playbackState,
        });
    });

    socket.on("room:playback", ({ roomId, action, currentTime = 0 }) => {
        const room = getRoom(roomId);
        if (!room) return;

        if (room.hostSocketId !== socket.id) {
            socket.emit("room:error", {
                message: "Only the host can control playback",
            });
            return;
        }

        const isPlaying = action === "play";

        const updatedRoom = setPlaybackState(roomId, {
            isPlaying,
            currentTime,
        });

        io.to(roomId).emit("room:playback", {
            roomId,
            playbackState: updatedRoom.playbackState,
        });
    });

    socket.on("room:message", ({ roomId, text }) => {
        const room = getRoom(roomId);
        if (!room) return;

        const cleanText = String(text || "").trim();
        if (!cleanText) return;

        addMessage(roomId, {
            socketId: socket.id,
            userName: socket.data.userName || "Guest",
            text: cleanText,
        });

        io.to(roomId).emit("room:messages", {
            roomId,
            messages: getRoom(roomId).messages,
        });
    });

    socket.on("disconnect", () => {
        const roomId = socket.data.roomId;

        if (roomId) {
            removeMember(roomId, socket.id);

            const updatedRoom = getRoom(roomId);
            if (updatedRoom) {
                io.to(roomId).emit("room:members", {
                    roomId,
                    members: updatedRoom.members,
                    hostSocketId: updatedRoom.hostSocketId,
                });
            }
        }

        console.log(`Socket disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});