import { Router } from "express";
import crypto from "crypto";
import { createRoom, getRoom } from "../data/rooms.js";
import requireAuth from "../middlewares/requireAuth.js";

const router = Router();

router.post("/create", requireAuth, (req, res) => {
    try {
        const { roomName } = req.body || {};
        const roomId = crypto.randomBytes(3).toString("hex").toUpperCase();

        const room = createRoom({
            roomId,
            roomName,
            owner: {
                uid: req.user.uid,
                email: req.user.email || null,
            },
        });

        return res.status(201).json({
            success: true,
            room,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create room",
        });
    }
});

router.get("/:roomId", (req, res) => {
    const { roomId } = req.params;
    const room = getRoom(roomId);

    if (!room) {
        return res.status(404).json({
            success: false,
            message: "Room not found",
        });
    }

    return res.json({
        success: true,
        room,
    });
});

export default router;