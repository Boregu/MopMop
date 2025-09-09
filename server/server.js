import express from 'express'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

app.use(cors())
app.use(express.json())

// Game state
const gameState = {
  map: Array(20).fill(null).map(() => Array(20).fill(0)),
  players: new Map(),
  gameStarted: false,
  turn: 0
}

// Initialize map with terrain
function initializeMap() {
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 20; j++) {
      if (Math.random() < 0.1) {
        gameState.map[i][j] = -1 // Mountain
      } else if (Math.random() < 0.3) {
        gameState.map[i][j] = 1 // Neutral territory
      }
    }
  }
}

// Player colors
const playerColors = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16'  // Lime
]

function getPlayerColor(playerIndex) {
  return playerColors[playerIndex % playerColors.length]
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New player connected')
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      handleMessage(ws, message)
    } catch (error) {
      console.error('Error parsing message:', error)
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  })

  ws.on('close', () => {
    console.log('Player disconnected')
    // Remove player from game state
    for (const [playerId, player] of gameState.players) {
      if (player.ws === ws) {
        gameState.players.delete(playerId)
        broadcastGameState()
        break
      }
    }
  })

  // Send initial game state
  ws.send(JSON.stringify({
    type: 'gameState',
    data: {
      map: gameState.map,
      players: Array.from(gameState.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        territories: p.territories
      })),
      gameStarted: gameState.gameStarted
    }
  }))
})

function handleMessage(ws, message) {
  switch (message.type) {
    case 'joinGame':
      handleJoinGame(ws, message.data)
      break
    case 'claimTerritory':
      handleClaimTerritory(ws, message.data)
      break
    case 'startGame':
      handleStartGame(ws)
      break
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }))
  }
}

function handleJoinGame(ws, data) {
  const { playerName } = data
  
  if (!playerName || playerName.trim().length === 0) {
    ws.send(JSON.stringify({ type: 'error', message: 'Player name is required' }))
    return
  }

  // Check if name is already taken
  for (const player of gameState.players.values()) {
    if (player.name === playerName) {
      ws.send(JSON.stringify({ type: 'error', message: 'Player name already taken' }))
      return
    }
  }

  const playerId = uuidv4()
  const playerIndex = gameState.players.size
  
  const player = {
    id: playerId,
    name: playerName,
    color: getPlayerColor(playerIndex),
    ws: ws,
    territories: 0,
    x: Math.floor(Math.random() * 20),
    y: Math.floor(Math.random() * 20)
  }

  gameState.players.set(playerId, player)
  
  ws.send(JSON.stringify({
    type: 'joinSuccess',
    data: {
      playerId: playerId,
      playerName: playerName,
      color: player.color
    }
  }))

  broadcastGameState()
  console.log(`Player ${playerName} joined the game`)
}

function handleClaimTerritory(ws, data) {
  const { x, y, playerId } = data
  
  const player = gameState.players.get(playerId)
  if (!player || player.ws !== ws) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid player' }))
    return
  }

  if (x < 0 || x >= 20 || y < 0 || y >= 20) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid coordinates' }))
    return
  }

  if (gameState.map[x][y] === -1) {
    ws.send(JSON.stringify({ type: 'error', message: 'Cannot claim mountain' }))
    return
  }

  // Check if territory is adjacent to player's existing territories
  const isAdjacent = checkAdjacency(x, y, playerId)
  if (!isAdjacent && player.territories > 0) {
    ws.send(JSON.stringify({ type: 'error', message: 'Territory must be adjacent to your existing territories' }))
    return
  }

  // Claim the territory
  const oldValue = gameState.map[x][y]
  const playerIndex = Array.from(gameState.players.keys()).indexOf(playerId)
  gameState.map[x][y] = playerIndex + 2 // Player territories start from 2
  
  if (oldValue !== playerIndex + 2) {
    player.territories++
  }

  broadcastGameState()
  console.log(`Player ${player.name} claimed territory at (${x}, ${y})`)
}

function checkAdjacency(x, y, playerId) {
  const playerIndex = Array.from(gameState.players.keys()).indexOf(playerId)
  const playerTerritoryValue = playerIndex + 2
  
  // Check all 4 directions (up, down, left, right) for adjacency
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ]
  
  for (const [dx, dy] of directions) {
    const nx = x + dx
    const ny = y + dy
    
    if (nx >= 0 && nx < 20 && ny >= 0 && ny < 20) {
      if (gameState.map[nx][ny] === playerTerritoryValue) {
        return true
      }
    }
  }
  
  return false
}

function handleStartGame(ws) {
  if (gameState.players.size < 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Need at least 2 players to start' }))
    return
  }

  gameState.gameStarted = true
  broadcastGameState()
  console.log('Game started!')
}

function broadcastGameState() {
  const gameStateData = {
    type: 'gameState',
    data: {
      map: gameState.map,
      players: Array.from(gameState.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        territories: p.territories
      })),
      gameStarted: gameState.gameStarted
    }
  }

  const message = JSON.stringify(gameStateData)
  
  gameState.players.forEach(player => {
    if (player.ws.readyState === 1) { // WebSocket.OPEN
      player.ws.send(message)
    }
  })
}

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', players: gameState.players.size })
})

app.get('/api/gamestate', (req, res) => {
  res.json({
    map: gameState.map,
    players: Array.from(gameState.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      territories: p.territories
    })),
    gameStarted: gameState.gameStarted
  })
})

// Initialize the map
initializeMap()

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`MopMop server running on port ${PORT}`)
  console.log(`WebSocket server ready for connections`)
})
