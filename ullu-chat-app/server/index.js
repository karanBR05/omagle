import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Queue: { socketId: string, mode: string }
let waitingQueue = [];

const broadcastUserCount = () => {
    const count = io.engine.clientsCount;
    // console.log(`Broadcasting user count: ${count}, Queue size: ${waitingQueue.length}`);
    io.emit('user_count', count);
};

const userRooms = new Map(); // socketId -> roomId

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    broadcastUserCount();

    socket.on('find_partner', (mode) => {
        // Also ensure we leave any previous room if we were in one?
        // Typically valid match finding implies we are free.

        // 1. Clean self from queue to prevent self-match
        waitingQueue = waitingQueue.filter(u => u.socketId !== socket.id);

        let partner = null;

        // 2. Iterate queue to find VALID partner
        while (waitingQueue.length > 0) {
            const candidateEntry = waitingQueue.shift(); // Unshift (start from oldest)
            const candidateSocket = io.sockets.sockets.get(candidateEntry.socketId);

            if (candidateSocket && !candidateSocket.disconnected) {
                partner = candidateSocket;
                break; // Found one!
            } else {
                console.log(`Found dead user in queue: ${candidateEntry.socketId}, removing...`);
                // They are already shifted out, so just loop again
            }
        }

        if (partner) {
            // MATCH FOUND
            const roomId = [socket.id, partner.id].sort().join('_');

            socket.join(roomId);
            partner.join(roomId);

            userRooms.set(socket.id, roomId);
            userRooms.set(partner.id, roomId);

            // Notify both users
            io.to(partner.id).emit('match_found', { roomId, initiator: true });
            socket.emit('match_found', { roomId, initiator: false });

            console.log(`Matched ${socket.id} with ${partner.id} in ${roomId}`);
        } else {
            // NO MATCH FOUND - Add self to queue
            waitingQueue.push({ socketId: socket.id, mode });
            socket.emit('waiting', { message: 'Looking for a match...' });
            console.log(`User ${socket.id} added to waitlist. Queue size: ${waitingQueue.length}`);
        }
    });

    socket.on('signal', (data) => {
        socket.to(data.roomId).emit('signal', data.signal);
    });

    socket.on('message', (data) => {
        socket.to(data.roomId).emit('message', {
            sender: 'Stranger',
            text: data.text,
            type: 'incoming',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        waitingQueue = waitingQueue.filter(u => u.socketId !== socket.id);

        const roomId = userRooms.get(socket.id);
        if (roomId) {
            socket.to(roomId).emit('partner_disconnected');
            userRooms.delete(socket.id);
        }

        broadcastUserCount();
    });

    socket.on('leave_chat', () => {
        const roomId = userRooms.get(socket.id);
        if (roomId) {
            socket.to(roomId).emit('partner_disconnected');
            socket.leave(roomId);
            userRooms.delete(socket.id);
        }
    });

    socket.on('request_user_count', () => {
        socket.emit('user_count', io.engine.clientsCount);
    });
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
