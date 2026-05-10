import crypto from "crypto";

export const rooms = new Map();

export function createRoom({ roomId, roomName = "", owner = null }) {
    const room = {
        id: roomId,
        name: roomName.trim() || `Room ${roomId}`,
        createdAt: new Date().toISOString(),
        ownerUid: owner?.uid || null,
        ownerEmail: owner?.email || null,
        hostSocketId: null,
        members: [],
        media: [],
        messages: [],
        currentMedia: null,
        playbackState: {
            isPlaying: false,
            currentTime: 0,
            updatedAt: null,
        },
    };

    rooms.set(roomId, room);
    return room;
}

export function getRoom(roomId) {
    return rooms.get(roomId);
}

export function addMember(roomId, member) {
    const room = rooms.get(roomId);
    if (!room) return null;

    const exists = room.members.find((m) => m.socketId === member.socketId);
    if (!exists) {
        room.members.push({
            socketId: member.socketId,
            userName: member.userName || "Guest",
            joinedAt: new Date().toISOString(),
        });
    }

    if (!room.hostSocketId) {
        room.hostSocketId = member.socketId;
    }

    return room;
}

export function removeMember(roomId, socketId) {
    const room = rooms.get(roomId);
    if (!room) return null;

    room.members = room.members.filter((m) => m.socketId !== socketId);

    if (room.hostSocketId === socketId) {
        room.hostSocketId = room.members[0]?.socketId || null;
    }

    return room;
}

export function addMedia(roomId, mediaItem) {
    const room = rooms.get(roomId);
    if (!room) return null;

    room.media.unshift(mediaItem);

    if (!room.currentMedia && mediaItem.mimeType?.startsWith("video/")) {
        room.currentMedia = mediaItem;
    }

    return room;
}

export function setCurrentMedia(roomId, mediaId) {
    const room = rooms.get(roomId);
    if (!room) return null;

    const selected = room.media.find((item) => item.id === mediaId);
    if (!selected) return null;

    room.currentMedia = selected;
    room.playbackState = {
        isPlaying: false,
        currentTime: 0,
        updatedAt: new Date().toISOString(),
    };

    return room;
}

export function setPlaybackState(roomId, nextState) {
    const room = rooms.get(roomId);
    if (!room) return null;

    room.playbackState = {
        ...room.playbackState,
        ...nextState,
        updatedAt: new Date().toISOString(),
    };

    return room;
}

export function addMessage(roomId, message) {
    const room = rooms.get(roomId);
    if (!room) return null;

    const newMessage = {
        id: crypto.randomUUID(),
        userName: message.userName || "Guest",
        text: message.text,
        socketId: message.socketId,
        createdAt: new Date().toISOString(),
    };

    room.messages.push(newMessage);
    return newMessage;
}