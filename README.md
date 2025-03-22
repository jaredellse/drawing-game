# Drawing Game

A real-time collaborative drawing application with video chat capabilities.

## Features

- Real-time collaborative drawing
- Video chat with other participants
- Preset drawing outlines (dog, cat, bunny, smiley face)
- Customizable brush sizes and colors
- Split-screen view to watch others draw
- Background color selection
- Clear canvas functionality

## Setup

1. Clone the repository:
```bash
git clone [your-repo-url]
cd drawing-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Start the WebSocket server:
```bash
cd server
npm install
npm start
```

## Usage

1. Enter your name to join the drawing room
2. Allow camera access for video chat (optional)
3. Use the toolbar to:
   - Select brush sizes
   - Choose colors
   - Pick background colors
   - Use preset outlines
   - Toggle split-screen view
   - Clear canvas

## Technologies Used

- React
- TypeScript
- Socket.IO
- WebRTC
- Vite

## License

MIT
