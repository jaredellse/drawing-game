import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import './App.css';
import { BrushIcon, PaletteIcon, CanvasIcon, ViewIcon, SplitIcon, VideoIcon, VideosIcon, TrashIcon } from './icons';
import React from 'react';

interface User {
  id: string;
  name: string;
  color: string;
}

interface UserStreams {
  [key: string]: MediaStream;
}

interface Point {
  x: number;
  y: number;
}

interface DrawingData {
  type: 'line' | 'preset';
  points: Point[];
  color: string;
  size: number;
  startX: number;
  startY: number;
  userId: string;
}

interface DrawingDataMap {
  [userId: string]: DrawingData[];
}

interface ViewMode {
  type: 'canvas' | 'split' | 'video';
}

// Define types for the shapes
type LineShape = {
  type: 'line';
  points: [number, number][];
};

type CurveShape = {
  type: 'curve';
  points: [number, number][];
};

type ArcShape = {
  type: 'arc';
  x: number;
  y: number;
  radius: number;
  startAngle: number;
  endAngle: number;
};

type Shape = LineShape | CurveShape | ArcShape;

// Tool icons with simpler selection
const toolIcons = {
  pencil: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  ),
  brush: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
      <path d="M2 2l7.586 7.586"/>
      <path d="M11 11l-4 4"/>
    </svg>
  ),
  clear: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  save: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  view: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  hideVideo: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
      <path d="M20 8v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8" />
      <path d="M4 8h16" />
    </svg>
  ),
  hideAll: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="M15 7l2 2" />
    </svg>
  ),
  palette: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
  ),
  background: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
    </svg>
  ),
  videoOn: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  videoOff: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
};

// Drawing colors in a palette style
const COLORS = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Pink
  '#000000', // Black
  '#FFFFFF', // White
];

// Canvas background colors in rainbow order
const BACKGROUND_COLORS = [
  '#FFFFFF', // White
  '#000000', // Black
  '#FFF5EE', // Warm White (Seashell)
  '#FFE4E1', // Light Pink/Red (Misty Rose)
  '#FFF0F5', // Pink (Lavender Blush)
  '#F5F5DC', // Yellow-tinted (Beige)
  '#F0FFF0', // Light Green (Honeydew)
  '#F0FFFF', // Light Cyan
  '#F0F8FF', // Light Blue (Alice Blue)
  '#E6E6FA', // Light Purple (Lavender)
  '#F0F0F0', // Light Gray
];

// Update brush sizes to match visual indicators
const BRUSH_SIZES = [4, 8, 12, 16];

// Update the dog outline to match the reference image more accurately
const PRESET_OUTLINES = {
  dog: [
    // Head (circle)
    { type: 'arc', x: 400, y: 250, radius: 80, startAngle: 0, endAngle: Math.PI * 2 },
    
    // Ears (triangles)
    { type: 'line', points: [[350, 180], [320, 120], [380, 180]] },
    { type: 'line', points: [[450, 180], [480, 120], [420, 180]] },
    
    // Eyes
    { type: 'arc', x: 360, y: 230, radius: 10, startAngle: 0, endAngle: Math.PI * 2 },
    { type: 'arc', x: 440, y: 230, radius: 10, startAngle: 0, endAngle: Math.PI * 2 },
    
    // Nose
    { type: 'arc', x: 400, y: 270, radius: 15, startAngle: 0, endAngle: Math.PI * 2 },
    
    // Mouth
    { type: 'curve', points: [[370, 290], [400, 310], [430, 290]] },
    
    // Body
    { type: 'curve', points: [[350, 330], [400, 350], [450, 330]] },
    { type: 'line', points: [[350, 330], [350, 450]] },
    { type: 'line', points: [[450, 330], [450, 450]] },
    { type: 'curve', points: [[350, 450], [400, 470], [450, 450]] }
  ],
  
  cat: [
    // Head (circle)
    { type: 'arc', x: 400, y: 300, radius: 80, startAngle: 0, endAngle: Math.PI * 2 },
    
    // Pointed ears (straight lines)
    { type: 'line', points: [[360, 240], [320, 180]] },  // Left ear outer
    { type: 'line', points: [[360, 240], [400, 180]] },  // Left ear inner
    { type: 'line', points: [[440, 240], [480, 180]] },  // Right ear outer
    { type: 'line', points: [[440, 240], [400, 180]] },  // Right ear inner
    
    // Eyes (small circles)
    { type: 'arc', x: 360, y: 280, radius: 8, startAngle: 0, endAngle: Math.PI * 2 },  // Left eye
    { type: 'arc', x: 440, y: 280, radius: 8, startAngle: 0, endAngle: Math.PI * 2 },  // Right eye
    
    // Nose (small circle)
    { type: 'arc', x: 400, y: 320, radius: 8, startAngle: 0, endAngle: Math.PI * 2 },
    
    // Mouth (diagonal lines)
    { type: 'line', points: [[380, 340], [400, 360]] },  // Left smile
    { type: 'line', points: [[400, 360], [420, 340]] },  // Right smile
    
    // Body (rectangle)
    { type: 'line', points: [[360, 380], [440, 380]] },  // Top
    { type: 'line', points: [[360, 380], [360, 460]] },  // Left side
    { type: 'line', points: [[440, 380], [440, 460]] },  // Right side
    { type: 'line', points: [[360, 460], [440, 460]] }   // Bottom
  ],
  
  bunny: [
    // Head (oval)
    { type: 'curve', points: [[350, 250], [400, 230], [450, 250]] },
    { type: 'curve', points: [[450, 250], [470, 300], [450, 350]] },
    { type: 'curve', points: [[450, 350], [400, 370], [350, 350]] },
    { type: 'curve', points: [[350, 350], [330, 300], [350, 250]] },
    
    // Long ears
    { type: 'curve', points: [[380, 250], [370, 150], [390, 100]] },
    { type: 'curve', points: [[420, 250], [430, 150], [410, 100]] },
    
    // Eyes
    { type: 'arc', x: 370, y: 280, radius: 10, startAngle: 0, endAngle: Math.PI * 2 },
    { type: 'arc', x: 430, y: 280, radius: 10, startAngle: 0, endAngle: Math.PI * 2 },
    
    // Nose
    { type: 'arc', x: 400, y: 300, radius: 8, startAngle: 0, endAngle: Math.PI * 2 },
    
    // Body
    { type: 'curve', points: [[350, 350], [400, 370], [450, 350]] },
    { type: 'line', points: [[350, 350], [350, 500]] },
    { type: 'line', points: [[450, 350], [450, 500]] },
    { type: 'curve', points: [[350, 500], [400, 520], [450, 500]] }
  ],
  
  smiley: [
    // Face (circle)
    { type: 'arc', x: 400, y: 300, radius: 100, startAngle: 0, endAngle: Math.PI * 2 },
    
    // Eyes
    { type: 'arc', x: 350, y: 260, radius: 15, startAngle: 0, endAngle: Math.PI * 2 },
    { type: 'arc', x: 450, y: 260, radius: 15, startAngle: 0, endAngle: Math.PI * 2 },
    
    // Smile
    { type: 'curve', points: [[320, 300], [400, 380], [480, 300]] }
  ]
};

// Add type for preset names
type PresetName = 'dog' | 'cat' | 'bunny' | 'smiley';

// Update the PRESET_IMAGES constant to use PNG files
const PRESET_IMAGES: Record<PresetName, string> = {
  dog: '/images/dog-outline.png',
  cat: '/images/cat-outline.png',
  bunny: '/images/bunny-outline.png',
  smiley: '/images/smiley-outline.png'
};

// Add this interface definition at the top with other interfaces
interface CanvasState {
  [userId: string]: DrawingData[];
}

interface MenuState {
  activeMenu: 'brush' | 'color' | 'view' | 'none';
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userName, setUserName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'pencil' | 'brush'>('pencil');
  const [shape, setShape] = useState<'circle' | 'rectangle' | 'triangle'>('circle');
  
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [drawingData, setDrawingData] = useState<DrawingDataMap>({});
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [userStreams, setUserStreams] = useState<UserStreams>({});
  const [viewMode, setViewMode] = useState<ViewMode>({ type: 'canvas' });
  const otherCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [selectedBrushSize, setSelectedBrushSize] = useState(1);
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('#FFFFFF');
  const [isParticipantViewVisible, setIsParticipantViewVisible] = useState(true);
  const [isVideoSidebarCollapsed, setIsVideoSidebarCollapsed] = useState(false);
  const [isViewingOther, setIsViewingOther] = useState(false);
  const [menuState, setMenuState] = useState<MenuState>({ activeMenu: 'none' });

  // Initialize socket connection
  useEffect(() => {
    const SOCKET_URL = import.meta.env.PROD 
      ? 'https://drawing-game-server-production.up.railway.app'
      : 'http://localhost:3002';

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      path: '/socket.io',
      withCredentials: true,
      autoConnect: true
    });

    setSocket(newSocket);

    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server at:', SOCKET_URL);
      // Re-join the game if we were previously joined
      if (userName) {
        newSocket.emit('join', {
          name: userName,
          color: '#' + Math.floor(Math.random()*16777215).toString(16)
        });
        setIsJoined(true);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('Attempting to reconnect...');
        setTimeout(() => {
          newSocket.connect();
        }, 1000);
      }
    });

    return () => {
      newSocket.close();
    };
  }, [userName]); // Add userName as dependency to handle reconnection

  useEffect(() => {
    if (!socket) return;

    socket.on('currentUsers', (users) => {
      setUsers(users);
    });

    socket.on('userJoined', (user: User) => {
      setUsers(prev => {
        if (prev.some(u => u.id === user.id)) {
          return prev;
        }
        return [...prev, user];
      });
    });

    socket.on('userLeft', (userId: string) => {
      setUsers(prev => prev.filter(user => user.id !== userId));
      setUserStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[userId];
        return newStreams;
      });
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
      }
    });

    return () => {
      socket.off('currentUsers');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, [socket, selectedUser]);

  // Initialize canvas and context with proper scaling
  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Set canvas size accounting for device pixel ratio
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Scale the context to account for the device pixel ratio
      ctx.scale(dpr, dpr);
      
      // Set drawing styles
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = selectedBrushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    // Initial resize
    resizeCanvas();

    // Add resize and orientation change listeners
    const handleResize = () => {
      requestAnimationFrame(resizeCanvas);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 100);
    });

    // Set context
    setContext(ctx);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', () => {
        setTimeout(handleResize, 100);
      });
    };
  }, [selectedColor, selectedBrushSize]);

  // Update context when color or brush size changes
  useEffect(() => {
    if (!context) return;
    context.strokeStyle = selectedColor;
    context.lineWidth = selectedBrushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }, [context, selectedColor, selectedBrushSize]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  // Memoize handlers to prevent re-renders
  const handleColorClick = React.useCallback((color: string) => {
    setSelectedColor(color);
    if (context) {
      context.strokeStyle = color;
    }
  }, [context]);

  const handleBrushSizeChange = React.useCallback((size: number) => {
    setSelectedBrushSize(size);
    if (context) {
      context.lineWidth = size;
    }
  }, [context]);

  // Handle drawing start
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const socketId = socket?.id;
    if (!mainCanvasRef.current || !socketId) return;
    e.preventDefault();
    
    const canvas = mainCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const { x, y } = coords;

    setIsDrawing(true);
    setLastPos({ x, y });

    // Set drawing styles
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = selectedBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Start new path
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Update drawing data
    const newDrawing: DrawingData = {
      type: 'line',
      points: [{ x, y }],
      color: selectedColor,
      size: selectedBrushSize,
      startX: x,
      startY: y,
      userId: socketId
    };

    setDrawingData(prev => ({
      ...prev,
      [socketId]: [...(prev[socketId] || []), newDrawing]
    }));

    socket.emit('draw', newDrawing);
  };

  // Handle drawing
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const socketId = socket?.id;
    if (!isDrawing || !mainCanvasRef.current || !socketId) return;
    e.preventDefault();
    
    const canvas = mainCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const { x, y } = coords;

    // Check if left mouse button is still pressed for mouse events
    if (!('touches' in e) && !(e.buttons & 1)) {
      setIsDrawing(false);
      return;
    }

    // Set drawing styles
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = selectedBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw line
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Update drawing data
    const newDrawing: DrawingData = {
      type: 'line',
      points: [{ x, y }],
      color: selectedColor,
      size: selectedBrushSize,
      startX: lastPos.x,
      startY: lastPos.y,
      userId: socketId
    };

    setDrawingData(prev => ({
      ...prev,
      [socketId]: [...(prev[socketId] || []), newDrawing]
    }));

    socket.emit('draw', newDrawing);
    setLastPos({ x, y });
  };

  // Handle drawing stop
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const drawOnCanvas = (drawing: DrawingData) => {
    const canvas = drawing.userId === socket?.id ? mainCanvasRef.current : otherCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = drawing.color;
    ctx.lineWidth = drawing.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(drawing.startX, drawing.startY);
    drawing.points.forEach(point => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.closePath();
  };

  const clearCanvas = () => {
    const socketId = socket?.id;
    if (!socketId || !mainCanvasRef.current) return;
    
    const ctx = mainCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, mainCanvasRef.current.width, mainCanvasRef.current.height);
    socket.emit('clearCanvas', socketId);
    
    // Update local drawing data
    setDrawingData(prev => ({
      ...prev,
      [socketId]: []
    }));
  };

  const saveDrawing = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const renderCanvas = (canvasRef: React.RefObject<HTMLCanvasElement>, userId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const userDrawings = drawingData[userId] || [];
    userDrawings.forEach(drawing => {
      const originalCtx = context;
      setContext(ctx);
      drawOnCanvas(drawing);
      setContext(originalCtx);
    });
  };

  useEffect(() => {
    if (mainCanvasRef.current && socket?.id) {
      renderCanvas(mainCanvasRef, socket.id);
    }
  }, [drawingData, socket?.id]);

  useEffect(() => {
    if (otherCanvasRef.current && selectedUser) {
      renderCanvas(otherCanvasRef, selectedUser.id);
    }
  }, [drawingData, selectedUser]);

  const toggleView = () => {
    setViewMode(prev => ({
      type: prev.type === 'canvas' ? 'split' : 'canvas'
    }));
  };

  // Update camera toggle function
  const toggleCamera = async () => {
    try {
      if (isCameraOn && localStream) {
        // Turn off camera
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        setIsCameraOn(false);
      } else {
        // Turn on camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true  // Add audio
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);
        setIsCameraOn(true);
      }
    } catch (err) {
      console.error('Error toggling camera:', err);
      alert('Could not access camera. Please check your camera permissions.');
      setIsCameraOn(false);
    }
  };

  // Update the drawPresetOutline function
  const drawPresetOutline = (presetName: PresetName) => {
    const canvas = mainCanvasRef.current;
    if (!canvas || !context || !socket?.id) return;

    const socketId = socket.id;

    // Create a new image
    const img = new Image();
    img.src = PRESET_IMAGES[presetName];
    
    img.onload = () => {
      // Clear the canvas first
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Set up the drawing style
      context.strokeStyle = selectedColor;
      context.lineWidth = selectedBrushSize;
      context.lineCap = 'round';
      context.lineJoin = 'round';

      // Calculate scale to fit the canvas while maintaining aspect ratio
      const maxWidth = canvas.width * 0.8;  // Use 80% of canvas width
      const maxHeight = canvas.height * 0.8; // Use 80% of canvas height
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      const width = img.width * scale;
      const height = img.height * scale;

      // Calculate position to center the image
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;

      // Draw the image
      context.drawImage(img, x, y, width, height);

      // Create drawing data with the image bounds
      const newDrawing: DrawingData = {
        type: 'preset',
        userId: socketId,
        color: selectedColor,
        size: selectedBrushSize,
        startX: x,
        startY: y,
        points: [
          { x, y },
          { x: x + width, y },
          { x: x + width, y: y + height },
          { x, y: y + height },
          { x, y } // Close the path
        ]
      };

      // Update drawing data
      setDrawingData(prev => ({
        ...prev,
        [socketId]: [newDrawing]
      }));

      // Emit the drawing
      socket.emit('draw', newDrawing);
    };

    img.onerror = (error) => {
      console.error(`Failed to load preset image: ${presetName}`, error);
    };
  };

  // Redraw all content on canvas
  const redrawCanvas = () => {
    const mainCanvas = mainCanvasRef.current;
    const otherCanvas = otherCanvasRef.current;
    if (!mainCanvas || !otherCanvas) return;

    const mainCtx = mainCanvas.getContext('2d');
    const otherCtx = otherCanvas.getContext('2d');
    if (!mainCtx || !otherCtx) return;

    // Clear both canvases
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    otherCtx.clearRect(0, 0, otherCanvas.width, otherCanvas.height);

    // Set up drawing styles
    mainCtx.strokeStyle = color;
    mainCtx.lineWidth = brushSize;
    mainCtx.lineCap = 'round';
    mainCtx.lineJoin = 'round';

    otherCtx.strokeStyle = color;
    otherCtx.lineWidth = brushSize;
    otherCtx.lineCap = 'round';
    otherCtx.lineJoin = 'round';

    // Draw all content
    Object.entries(drawingData).forEach(([userId, drawings]) => {
      const ctx = userId === socket?.id ? mainCtx : otherCtx;
      drawings.forEach(drawing => {
        if (drawing.type === 'line') {
          ctx.strokeStyle = drawing.color;
          ctx.lineWidth = drawing.size;
          ctx.beginPath();
          ctx.moveTo(drawing.startX, drawing.startY);
          drawing.points.forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        }
      });
    });
  };

  const joinGame = async () => {
    if (socket && userName.trim().length > 0) {  // Add length check
      try {
        // Initialize camera with mobile-friendly constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },  // Reduced size for mobile
            height: { ideal: 480 }
          },
          audio: false  // Disable audio for now to reduce complexity
        }).catch(() => {
          // Fallback to basic constraints if detailed ones fail
          return navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);
        setIsCameraOn(true);
        
        // Join the game
        socket.emit('join', {
          name: userName,
          color: '#' + Math.floor(Math.random()*16777215).toString(16)
        });
        setIsJoined(true);

        // After joining, initiate connections with existing users
        socket.emit('requestConnections');
      } catch (err) {
        console.error('Error accessing camera:', err);
        // Join without video
        socket.emit('join', {
          name: userName,
          color: '#' + Math.floor(Math.random()*16777215).toString(16)
        });
        setIsJoined(true);
        setIsCameraOn(false);
      }
    }
  };

  // Handle WebRTC connections
  useEffect(() => {
    if (!socket) return;

    const peerConnections = new Map<string, RTCPeerConnection>();

    socket.on('userJoinedWithVideo', async (userId: string) => {
      try {
        if (!localStream) return;

        // Create new RTCPeerConnection with STUN servers
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ]
        });
        
        peerConnections.set(userId, peerConnection);

        // Add local stream tracks
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', {
              to: userId,
              candidate: event.candidate
            });
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log('Connection state:', peerConnection.connectionState);
        };

        // Handle ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', peerConnection.iceConnectionState);
        };

        // Handle incoming stream
        peerConnection.ontrack = (event) => {
          console.log('Received remote track');
          const [remoteStream] = event.streams;
          setUserStreams(prev => ({
            ...prev,
            [userId]: remoteStream
          }));
        };

        // Create and send offer
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('offer', {
          to: userId,
          offer: peerConnection.localDescription
        });
      } catch (err) {
        console.error('Error creating WebRTC connection:', err);
      }
    });

    socket.on('offer', async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      try {
        if (!localStream) return;

        // Create new RTCPeerConnection with STUN servers
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ]
        });
        
        peerConnections.set(data.from, peerConnection);

        // Add local stream tracks
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', {
              to: data.from,
              candidate: event.candidate
            });
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log('Connection state:', peerConnection.connectionState);
        };

        // Handle ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', peerConnection.iceConnectionState);
        };

        // Handle incoming stream
        peerConnection.ontrack = (event) => {
          console.log('Received remote track');
          const [remoteStream] = event.streams;
          setUserStreams(prev => ({
            ...prev,
            [data.from]: remoteStream
          }));
        };

        // Set remote description (offer)
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        // Create and send answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('answer', {
          to: data.from,
          answer: peerConnection.localDescription
        });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    socket.on('answer', async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      try {
        const peerConnection = peerConnections.get(data.from);
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    });

    socket.on('ice-candidate', async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      try {
        const peerConnection = peerConnections.get(data.from);
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error('Error handling ICE candidate:', err);
      }
    });

    // Cleanup function
    return () => {
      peerConnections.forEach(connection => {
        connection.close();
      });
      peerConnections.clear();
      socket.off('userJoinedWithVideo');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [socket, localStream]);

  // Handle drawing events
  useEffect(() => {
    if (!socket) return;

    // Handle receiving drawing data from other users
    const handleDraw = (data: DrawingData) => {
      setDrawingData(prev => ({
        ...prev,
        [data.userId]: [...(prev[data.userId] || []), data]
      }));

      // Draw on the appropriate canvas regardless of view mode
      const canvas = data.userId === socket.id ? mainCanvasRef.current : otherCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(data.startX, data.startY);
      data.points.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    };

    // Handle canvas clearing
    const handleClearCanvas = (userId: string) => {
      setDrawingData(prev => ({
        ...prev,
        [userId]: []
      }));

      const canvas = userId === socket.id ? mainCanvasRef.current : otherCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    // Handle initial state when joining
    socket.on('currentState', (state: CanvasState) => {
      setDrawingData(state);  // Now the types are compatible
      Object.entries(state).forEach(([userId, drawings]) => {
        drawings.forEach((drawing: DrawingData) => {
          const canvas = userId === socket.id ? mainCanvasRef.current : otherCanvasRef.current;
          if (!canvas) return;
          drawOnCanvas(drawing);
        });
      });
    });

    socket.on('draw', handleDraw);
    socket.on('clearCanvas', handleClearCanvas);

    return () => {
      socket.off('draw', handleDraw);
      socket.off('clearCanvas', handleClearCanvas);
      socket.off('currentState');
    };
  }, [socket, selectedUser]);

  // Handle menu item click
  const handleMenuClick = (menu: MenuState['activeMenu']) => {
    setMenuState(prev => ({
      activeMenu: prev.activeMenu === menu ? 'none' : menu
    }));
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.menu-item')) {
        setMenuState({ activeMenu: 'none' });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Add clear canvas handler
  const handleClearCanvas = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket?.emit('clearCanvas');
  }, [socket]);

  // Handle user selection
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setViewMode({ type: 'split' });
    setIsViewingOther(true);
  };

  // Update view mode handler
  const handleViewModeChange = (type: ViewMode['type']) => {
    setViewMode({ type });
  };

  if (!isJoined) {
    return (
      <div className="join-screen">
        <h1>Join Drawing Game</h1>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (userName.trim().length > 0) {
            joinGame();
          }
        }}>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            minLength={2}
            required
          />
          <button type="submit">Join Game</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="top-menu">
        {/* Brush Size Menu */}
        <div className={`menu-item ${menuState.activeMenu === 'brush' ? 'active' : ''}`}
             onClick={() => handleMenuClick('brush')}>
          <BrushIcon />
          <div className="menu-dropdown">
            <div className="brush-sizes">
              {[2, 4, 6, 8, 10].map((size) => (
                <button
                  key={size}
                  className={`brush-size-button ${selectedBrushSize === size ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrushSizeChange(size);
                    setMenuState({ activeMenu: 'none' });
                  }}
                >
                  <div className="dot" style={{ width: size, height: size }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Color Palette Menu */}
        <div className={`menu-item ${menuState.activeMenu === 'color' ? 'active' : ''}`}
             onClick={() => handleMenuClick('color')}>
          <PaletteIcon />
          <div className="menu-dropdown">
            <div className="color-palette">
              {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'].map((color) => (
                <button
                  key={color}
                  className={`color-button ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorClick(color);
                    setMenuState({ activeMenu: 'none' });
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* View Mode Menu */}
        <div className={`menu-item ${menuState.activeMenu === 'view' ? 'active' : ''}`}
             onClick={() => handleMenuClick('view')}>
          <ViewIcon />
          <div className="menu-dropdown">
            <button
              className={`brush-size-button ${viewMode.type === 'canvas' ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleViewModeChange('canvas');
                setMenuState({ activeMenu: 'none' });
              }}
            >
              <CanvasIcon /> Canvas Only
            </button>
            <button
              className={`brush-size-button ${viewMode.type === 'split' ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleViewModeChange('split');
                setMenuState({ activeMenu: 'none' });
              }}
            >
              <SplitIcon /> Split View
            </button>
            <button
              className={`brush-size-button ${viewMode.type === 'video' ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleViewModeChange('video');
                setMenuState({ activeMenu: 'none' });
              }}
            >
              <VideosIcon /> Video Only
            </button>
          </div>
        </div>

        {/* Clear Canvas Button */}
        <div className="menu-item" onClick={handleClearCanvas}>
          <TrashIcon />
        </div>
      </div>

      <div className={`canvas-container ${viewMode.type === 'split' ? 'split-view' : 'side-by-side'} ${isToolbarCollapsed ? 'toolbar-collapsed' : ''} ${isViewingOther ? 'viewing-other' : ''}`}>
        <div className="canvas-wrapper" style={{ background: selectedBackgroundColor }}>
          <div className="canvas-header">
            <div className="canvas-label">{userName}'s Canvas</div>
            <div className="canvas-presets">
              <button className="preset-button" onClick={() => drawPresetOutline('dog')}>🐕</button>
              <button className="preset-button" onClick={() => drawPresetOutline('cat')}>🐱</button>
              <button className="preset-button" onClick={() => drawPresetOutline('bunny')}>🐰</button>
              <button className="preset-button" onClick={() => drawPresetOutline('smiley')}>😊</button>
            </div>
          </div>
          <canvas
            ref={mainCanvasRef}
            width={800}
            height={600}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
            style={{ touchAction: 'none' }}
          />
        </div>

        {viewMode.type === 'split' && selectedUser && (
          <div className="canvas-wrapper">
            <div className="canvas-header">
              <button 
                className="back-button"
                onClick={() => setIsViewingOther(false)}
                title="Back to your canvas"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <div className="canvas-label">{selectedUser.name}'s Canvas</div>
            </div>
            <canvas
              ref={otherCanvasRef}
              width={800}
              height={600}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        )}
      </div>

      <div className={`video-sidebar ${isVideoSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="preview-container">
          <div className="preview-window">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
            />
            <div className="user-name">{userName} (You)</div>
            <div className="video-controls">
              <button
                className={`video-control-button ${isCameraOn ? 'active' : ''}`}
                onClick={toggleCamera}
                title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
              >
                {isCameraOn ? toolIcons.videoOn : toolIcons.videoOff}
              </button>
            </div>
          </div>

          {users
            .filter(user => user.id !== socket?.id)
            .map((user) => (
              <div
                key={user.id}
                className={`preview-window ${selectedUser?.id === user.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedUser(user);
                  setViewMode({ type: 'split' });
                  setIsViewingOther(true);
                }}
              >
                <video
                  ref={(el) => {
                    if (el && userStreams[user.id]) {
                      el.srcObject = userStreams[user.id];
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                />
                <div className="user-name">{user.name}</div>
              </div>
            ))}
        </div>
      </div>

      <button 
        className={`video-toggle ${isVideoSidebarCollapsed ? 'collapsed' : ''}`}
        onClick={() => setIsVideoSidebarCollapsed(!isVideoSidebarCollapsed)}
        title={isVideoSidebarCollapsed ? "Show Videos" : "Hide Videos"}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>

      <div className="users-list">
        {users.map((user) => (
          <div
            key={user.id}
            className="user-item"
            onClick={() => handleUserSelect(user)}
          >
            {user.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;