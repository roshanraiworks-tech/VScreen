import { io } from "socket.io-client";

const serverUrl = import.meta.env.VITE_SERVER_URL;

const socket = io(serverUrl, {
    autoConnect: false,
});

export default socket;