import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Enable CORS for all routes
app.use(cors({
  origin: true, // This will reflect the request origin
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: true, // This will reflect the request origin
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type']
  },
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  transports: ['websocket', 'polling']
});

// Error handling for the server
httpServer.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error('Port is already in use. Please free up the port and try again.');
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});

// Serve static files from the client build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

interface User {
  id: string;
  name: string;
  color: string;
}

interface DrawingData {
  type: 'line' | 'preset';
  points: { x: number; y: number }[];
  color: string;
  size: number;
  startX: number;
  startY: number;
  userId: string;
}

interface CanvasState {
  [userId: string]: DrawingData[];
}

// Store active users and their drawings
const users = new Map<string, User>();
const canvasState: CanvasState = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userData: { name: string; color: string }) => {
    const userId = socket.id;
    users.set(userId, {
      id: userId,
      name: userData.name,
      color: userData.color
    });

    // Initialize empty canvas for new user
    canvasState[userId] = [];

    // Send current users to the new user
    socket.emit('currentUsers', Array.from(users.values()));
    // Send current canvas state to the new user
    socket.emit('currentState', canvasState);

    // Broadcast new user to others
    socket.broadcast.emit('userJoined', users.get(userId));
  });

  // Handle WebRTC signaling
  socket.on('requestConnections', () => {
    // Notify all other users to initiate connections with the new user
    socket.broadcast.emit('userJoinedWithVideo', socket.id);
  });

  socket.on('offer', (data: { to: string; offer: RTCSessionDescriptionInit }) => {
    io.to(data.to).emit('offer', {
      from: socket.id,
      offer: data.offer
    });
  });

  socket.on('answer', (data: { to: string; answer: RTCSessionDescriptionInit }) => {
    io.to(data.to).emit('answer', {
      from: socket.id,
      answer: data.answer
    });
  });

  socket.on('draw', (drawingData: DrawingData) => {
    const userId = drawingData.userId;
    if (!canvasState[userId]) {
      canvasState[userId] = [];
    }
    canvasState[userId].push(drawingData);
    
    // Broadcast drawing data to all clients
    socket.broadcast.emit('draw', drawingData);
  });

  socket.on('clearCanvas', (userId: string) => {
    if (canvasState[userId]) {
      canvasState[userId] = [];
    }
    // Broadcast clear canvas event to all other clients
    socket.broadcast.emit('clearCanvas', userId);
  });

  socket.on('disconnect', () => {
    const userId = socket.id;
    const user = users.get(userId);
    
    if (user) {
      users.delete(userId);
      delete canvasState[userId];
      io.emit('userLeft', userId);
    }
  });
});

const port = process.env.PORT || 3002;
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 