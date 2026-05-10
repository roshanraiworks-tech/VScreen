import { Router } from "express";
import crypto from "crypto";
import upload from "../middlewares/upload.js";
import requireAuth from "../middlewares/requireAuth.js";
import { addMedia, getRoom } from "../data/rooms.js";

const router = Router();

router.post("/", requireAuth, upload.single("media"), (req, res) => {
    try {
        const { roomId } = req.body;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: "Room ID is required",
            });
        }

        const room = getRoom(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }

        const mediaItem = {
            id: crypto.randomUUID(),
            title: req.file.originalname,
            fileName: req.file.filename,
            mimeType: req.file.mimetype,
            size: req.file.size,
            url: `/uploads/${req.file.filename}`,
            uploadedBy: req.user.email || req.user.uid,
            uploadedAt: new Date().toISOString(),
        };

        addMedia(roomId, mediaItem);

        const updatedRoom = getRoom(roomId);
        const io = req.app.get("io");

        if (io) {
            io.to(roomId).emit("room:media", {
                roomId,
                media: updatedRoom.media,
            });
        }

        return res.status(201).json({
            success: true,
            media: mediaItem,
            room: updatedRoom,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "File upload failed",
        });
    }
});

export default router;