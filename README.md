# MopMop - Real-time Strategy Game

A web-based real-time strategy game inspired by generals.io, built with React, TypeScript, Node.js, and WebSockets.

## Features

- 🎮 Real-time multiplayer gameplay
- 🗺️ 20x20 grid-based map with terrain
- 🏔️ Mountains (impassable terrain)
- 🎯 Territory claiming and expansion
- 🌈 Color-coded players
- ⚡ WebSocket-based real-time communication

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation & Running

1. **Install server dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Install client dependencies:**
   ```bash
   cd ../client
   npm install
   ```

3. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```
   The server will run on `http://localhost:3001`

4. **Start the client (in a new terminal):**
   ```bash
   cd client
   npm run dev
   ```
   The client will run on `http://localhost:5173`

5. **Open your browser and go to `http://localhost:5173`**

## How to Play

1. **Join the Game:** Enter your name and click "Join Game"
2. **Wait for Players:** You need at least 2 players to start
3. **Start Game:** Once you have enough players, click "Start Game"
4. **Claim Territories:** Click on empty or neutral territories to claim them
5. **Expand:** You can only claim territories adjacent to your existing ones
6. **Win:** Be the last player standing!

## Game Rules

- **Mountains (Gray):** Cannot be claimed or passed through
- **Neutral Territory (Light Gray):** Can be claimed by any player
- **Empty Territory (Dark Gray):** Can be claimed by any player
- **Player Territories:** Color-coded by player
- **Adjacency Rule:** You can only claim territories adjacent to your existing ones

## Technical Details

### Frontend (React + TypeScript)
- **Framework:** React 19 with TypeScript
- **Styling:** Tailwind CSS v4
- **Build Tool:** Vite
- **Real-time:** WebSocket client

### Backend (Node.js)
- **Runtime:** Node.js with ES modules
- **WebSocket:** ws library for real-time communication
- **HTTP Server:** Express.js
- **CORS:** Enabled for cross-origin requests

### Architecture
- **Real-time Communication:** WebSocket connections for instant updates
- **Game State:** Centralized on the server
- **Player Management:** UUID-based player identification
- **Map System:** 2D array representing the game world

## Development

### Project Structure
```
MopMop/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.tsx        # Main game component
│   │   ├── index.css      # Tailwind CSS imports
│   │   └── main.tsx       # React entry point
│   └── package.json
├── server/                 # Node.js backend
│   ├── server.js          # Main server file
│   └── package.json
└── README.md
```

### Available Scripts

**Client:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Server:**
- `npm run dev` - Start server with auto-reload
- `npm start` - Start production server

## Future Enhancements

- [ ] Turn-based gameplay
- [ ] Unit movement and combat
- [ ] Resource management
- [ ] Chat system
- [ ] Game rooms/lobbies
- [ ] Spectator mode
- [ ] Mobile responsiveness improvements
- [ ] Sound effects and animations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for learning or as a starting point for your own games!
