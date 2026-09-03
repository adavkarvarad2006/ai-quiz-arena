import { io } from "socket.io-client";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SOCKET_URL = apiBase.replace(/\/api\/?$/, "");

console.log("Socket URL:", SOCKET_URL);

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    transports: ["websocket", "polling"],
});

socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
});