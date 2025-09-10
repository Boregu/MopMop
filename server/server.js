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
  armies: Array(20).fill(null).map(() => Array(20).fill(0)),
  villages: Array(20).fill(null).map(() => Array(20).fill(false)), // Track which tiles are villages
  players: new Map(),
  gameStarted: false,
  turn: 0,
  mountainSpawnRate: 20, // Default 20%
  villageSpawnRate: 3    // Default 3%
}

// Global interval reference
let gameInterval = null

// Function to reset game state completely
function resetGameState() {
  console.log('Resetting game state...')
  
  // Clear interval
  if (gameInterval) {
    clearInterval(gameInterval)
    gameInterval = null
  }
  
  // Reset game state
  gameState.gameStarted = false
  gameState.turn = 0
  gameState.players.clear()
  gameState.forceStartVotes.clear()
  
  // Reset arrays
  gameState.villages = Array(20).fill(null).map(() => Array(20).fill(false))
  gameState.armies = Array(20).fill(null).map(() => Array(20).fill(0))
  gameState.map = Array(20).fill(null).map(() => Array(20).fill(0))
  
  // Generate new map
  initializeMap()
  
  console.log('Game state reset complete')
}

// Initialize map with terrain
function initializeMap() {
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 20; j++) {
      const rand = Math.random() * 100 // 0-100 percentage
      if (rand < gameState.mountainSpawnRate) {
        gameState.map[i][j] = -1 // Mountain
      } else if (rand < gameState.mountainSpawnRate + gameState.villageSpawnRate) {
        gameState.map[i][j] = -2 // Village (35-45 armies)
        gameState.armies[i][j] = Math.floor(Math.random() * 11) + 35 // 35-45 armies
        gameState.villages[i][j] = true // Mark as village
      }
      // All other tiles remain 0 (empty) - no neutral territories
    }
  }
}

// Player colors
const playerColors = [
  '#EF4444', // Red
  '#3B82F6', // Blue
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
        break
      }
    }
    
    // If no players left, reset the game
    if (gameState.players.size === 0) {
      console.log('No players left, resetting game')
      resetGameState()
    }
    
    broadcastGameState()
  })

  // Send initial game state
  ws.send(JSON.stringify({
    type: 'gameState',
    data: {
      map: gameState.map,
      armies: gameState.armies,
      players: Array.from(gameState.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        territories: p.territories,
        kingX: p.kingX,
        kingY: p.kingY
      })),
      gameStarted: gameState.gameStarted,
      turn: gameState.turn
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
    case 'moveArmies':
      handleMoveArmies(ws, message.data)
      break
    case 'queueMoves':
      handleQueueMoves(ws, message.data)
      break
    case 'quit':
      handleQuit(ws, message.data)
      break
      case 'chat':
        handleChat(ws, message.data)
        break
      case 'purchaseWeapon':
        handlePurchaseWeapon(ws, message.data)
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
  
  // Find a good starting position for the king
  let kingX, kingY
  do {
    kingX = Math.floor(Math.random() * 20)
    kingY = Math.floor(Math.random() * 20)
  } while (gameState.map[kingX][kingY] === -1 || gameState.map[kingX][kingY] >= 2)

  const player = {
    id: playerId,
    name: playerName,
    color: getPlayerColor(playerIndex),
    ws: ws,
    territories: 1,
    kingX: kingX,
    kingY: kingY
  }

  // Place the king and initial territory
  gameState.map[kingX][kingY] = playerIndex + 2
  gameState.armies[kingX][kingY] = 1

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
  broadcastLobbyUpdate()
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

function handleStartGame(ws, data) {
  console.log('handleStartGame called')
  
  // Find the player who sent this request
  let playerId = null
  for (const [id, player] of gameState.players) {
    if (player.ws === ws) {
      playerId = id
      break
    }
  }
  
  console.log('Found playerId:', playerId)
  
  if (!playerId) {
    console.log('Player not found, sending error')
    ws.send(JSON.stringify({ type: 'error', message: 'Player not found' }))
    return
  }
  
  // Add force start vote
  gameState.forceStartVotes.add(playerId)
  console.log('Added force start vote for player:', playerId)
  console.log('Current force start votes:', Array.from(gameState.forceStartVotes))
  
  const totalPlayers = gameState.players.size
  const votesNeeded = Math.ceil(totalPlayers / 2) // Need majority to force start
  const currentVotes = gameState.forceStartVotes.size
  
  console.log(`Force start vote: ${currentVotes}/${totalPlayers} (need ${votesNeeded})`)
  
  // Broadcast lobby update with force start votes
  broadcastLobbyUpdate()
  
  // Check if we have enough votes to start
  if (currentVotes >= votesNeeded && totalPlayers >= 2) {
    console.log('Force start successful! Starting game...')
    gameState.gameStarted = true
    broadcastGameState()
    console.log('Game started!')
    
    // Start army generation timer
    startArmyGeneration()
  } else if (totalPlayers < 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Need at least 2 players to start' }))
  }
}

function handleMoveArmies(ws, data) {
  const { fromX, fromY, toX, toY, playerId, isSplit } = data
  
  const player = gameState.players.get(playerId)
  if (!player || player.ws !== ws) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid player' }))
    return
  }

  if (fromX < 0 || fromX >= 20 || fromY < 0 || fromY >= 20 ||
      toX < 0 || toX >= 20 || toY < 0 || toY >= 20) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid coordinates' }))
    return
  }

  // Check if source tile belongs to player
  const playerIndex = Array.from(gameState.players.keys()).indexOf(playerId)
  const playerTerritoryValue = playerIndex + 2
  
  if (gameState.map[fromX][fromY] !== playerTerritoryValue) {
    ws.send(JSON.stringify({ type: 'error', message: 'Source tile does not belong to you' }))
    return
  }

  // Check if there are armies to move
  if (gameState.armies[fromX][fromY] <= 0) {
    ws.send(JSON.stringify({ type: 'error', message: 'No armies to move' }))
    return
  }

  // Check if target is adjacent
  const dx = Math.abs(toX - fromX)
  const dy = Math.abs(toY - fromY)
  if (dx + dy !== 1) {
    ws.send(JSON.stringify({ type: 'error', message: 'Target must be adjacent' }))
    return
  }

  // Move armies
  const totalArmies = gameState.armies[fromX][fromY]
  
  // Check if this is a king tile - kings should keep at least 1 army
  const isKingTile = gameState.players.get(playerId).kingX === fromX && gameState.players.get(playerId).kingY === fromY
  
  let armiesToMove
  if (isSplit) {
    // Split move - move exactly half (rounded down)
    armiesToMove = Math.floor(totalArmies / 2)
    gameState.armies[fromX][fromY] = totalArmies - armiesToMove
  } else if (isKingTile) {
    // King keeps 1 army, move the rest
    armiesToMove = Math.max(0, totalArmies - 1)
    gameState.armies[fromX][fromY] = 1
  } else {
    // Regular tile - move all armies except 1 (leave 1 behind)
    armiesToMove = Math.max(0, totalArmies - 1)
    gameState.armies[fromX][fromY] = 1
  }

  // Handle target tile
  if (gameState.map[toX][toY] === -1) {
    // Mountain - armies are lost
    ws.send(JSON.stringify({ type: 'error', message: 'Cannot move into mountain' }))
    // Send move result - failed
    ws.send(JSON.stringify({ 
      type: 'moveResult', 
      data: { 
        success: false, 
        fromX, fromY, toX, toY, 
        reason: 'mountain' 
      } 
    }))
    // Restore armies to source tile
    gameState.armies[fromX][fromY] = totalArmies // Restore original count
    return
  } else if (gameState.map[toX][toY] === -2) {
    // Village - battle with village armies
    const villageArmies = gameState.armies[toX][toY]
    const remainingArmies = armiesToMove - villageArmies
    
    if (remainingArmies > 0) {
      // Conquer the village
      gameState.map[toX][toY] = playerTerritoryValue
      gameState.armies[toX][toY] = Math.max(1, remainingArmies)
      player.territories++
      
      // Send move result - success (conquered village)
      ws.send(JSON.stringify({ 
        type: 'moveResult', 
        data: { 
          success: true, 
          fromX, fromY, toX, toY, 
          reason: 'conquered_village' 
        } 
      }))
    } else {
      // Failed to conquer village - armies are lost
      gameState.armies[toX][toY] = Math.max(0, villageArmies - armiesToMove)
      
      // Send move result - failed (battle lost)
      ws.send(JSON.stringify({ 
        type: 'moveResult', 
        data: { 
          success: false, 
          fromX, fromY, toX, toY, 
          reason: 'village_battle_lost' 
        } 
      }))
    }
  } else if (gameState.map[toX][toY] === playerTerritoryValue) {
    // Own territory - just add armies
    gameState.armies[toX][toY] += armiesToMove
    // Send move result - success
    ws.send(JSON.stringify({ 
      type: 'moveResult', 
      data: { 
        success: true, 
        fromX, fromY, toX, toY, 
        reason: 'own_territory' 
      } 
    }))
  } else {
    // Enemy or neutral territory - battle
    const enemyArmies = gameState.armies[toX][toY]
    const remainingArmies = armiesToMove - enemyArmies // No extra -1, just armies vs armies
    
    if (remainingArmies > 0) {
      // Conquer the territory
      const previousOwnerValue = gameState.map[toX][toY]
      gameState.map[toX][toY] = playerTerritoryValue
      gameState.armies[toX][toY] = Math.max(1, remainingArmies) // At least 1 army
      player.territories++
      
      // Remove territory from previous owner if any
      if (previousOwnerValue >= 2) {
        const previousOwnerIndex = previousOwnerValue - 2
        const previousOwner = Array.from(gameState.players.values())[previousOwnerIndex]
        if (previousOwner) {
          previousOwner.territories--
          
          // Check if this was a king capture
          if (previousOwner.kingX === toX && previousOwner.kingY === toY) {
            // King was captured! Check if this was the last king
            const remainingKings = Array.from(gameState.players.values()).filter(p => 
              p.kingX !== toX || p.kingY !== toY
            )
            
            if (remainingKings.length === 1) {
              // Only one king left - game over!
              const winner = remainingKings[0]
              const loser = previousOwner
              
              // Send win/lose messages
              winner.ws.send(JSON.stringify({
                type: 'gameOver',
                data: { won: true, winner: winner.name, loser: loser.name }
              }))
              
              loser.ws.send(JSON.stringify({
                type: 'gameOver', 
                data: { won: false, winner: winner.name, loser: loser.name }
              }))
              
              // Reset game state
              resetGameState()
            }
          }
        }
      }
      
      // Send move result - success (conquered)
      ws.send(JSON.stringify({ 
        type: 'moveResult', 
        data: { 
          success: true, 
          fromX, fromY, toX, toY, 
          reason: 'conquered' 
        } 
      }))
    } else {
      // Failed to conquer - armies are lost
      gameState.armies[toX][toY] = Math.max(0, enemyArmies - armiesToMove)
      
      // Send move result - failed (battle lost)
      ws.send(JSON.stringify({ 
        type: 'moveResult', 
        data: { 
          success: false, 
          fromX, fromY, toX, toY, 
          reason: 'battle_lost' 
        } 
      }))
    }
  }

  broadcastGameState()
  console.log(`Player ${player.name} moved ${armiesToMove} armies from (${fromX}, ${fromY}) to (${toX}, ${toY})`)
}

function handleQueueMoves(ws, data) {
  const { moves, playerId } = data
  
  const player = gameState.players.get(playerId)
  if (!player || player.ws !== ws) {
    return
  }

  // Only process the first move in the queue
  if (moves.length > 0) {
    const move = moves[0]
    handleMoveArmies(ws, {
      fromX: move.fromX,
      fromY: move.fromY,
      toX: move.toX,
      toY: move.toY,
      playerId: playerId,
      isSplit: move.isSplit
    })
  }
}

function handleQuit(ws, data) {
  const { playerId } = data
  
  const player = gameState.players.get(playerId)
  if (!player || player.ws !== ws) {
    return
  }

  // Remove player from game
  gameState.players.delete(playerId)
  
  // If game was started and only one player left, end the game
  if (gameState.gameStarted && gameState.players.size === 1) {
    const remainingPlayer = Array.from(gameState.players.values())[0]
    remainingPlayer.ws.send(JSON.stringify({
      type: 'gameOver',
      data: { won: true, winner: remainingPlayer.name, reason: 'opponent_quit' }
    }))
    
    // Reset game state
    resetGameState()
  } else {
    // Broadcast updated game state
    broadcastGameState()
  }
}

function handleChat(ws, data) {
  const { playerId, message } = data
  
  const player = gameState.players.get(playerId)
  if (!player || player.ws !== ws) {
    return
  }

  // Broadcast chat message to all players
  const chatMessage = {
    type: 'chatMessage',
    data: {
      player: player.name,
      message: message,
      timestamp: Date.now()
    }
  }

  gameState.players.forEach(p => {
    p.ws.send(JSON.stringify(chatMessage))
  })
}

function handlePurchaseWeapon(ws, data) {
  const { playerId, x, y, weaponType } = data
  
  const player = gameState.players.get(playerId)
  if (!player || player.ws !== ws) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid player' }))
    return
  }
  
  if (x < 0 || x >= 20 || y < 0 || y >= 20) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid coordinates' }))
    return
  }
  
  // Check if tile belongs to player
  const playerIndex = Array.from(gameState.players.keys()).indexOf(playerId)
  const playerTerritoryValue = playerIndex + 2
  
  if (gameState.map[x][y] !== playerTerritoryValue) {
    ws.send(JSON.stringify({ type: 'error', message: 'Tile does not belong to you' }))
    return
  }
  
  // Check if player has enough armies
  if (gameState.armies[x][y] < 200) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not enough armies (need 200)' }))
    return
  }
  
  // Deduct 200 armies
  gameState.armies[x][y] -= 200
  
  // For now, just send success message (weapon functionality can be added later)
  ws.send(JSON.stringify({ 
    type: 'weaponPurchased', 
    data: { 
      weaponType, 
      x, 
      y, 
      remainingArmies: gameState.armies[x][y] 
    } 
  }))
  
  broadcastGameState()
  console.log(`Player ${player.name} purchased ${weaponType} at (${x}, ${y})`)
}

function startArmyGeneration() {
  // Clear any existing interval
  if (gameInterval) {
    clearInterval(gameInterval)
  }
  
  gameInterval = setInterval(() => {
    if (!gameState.gameStarted) return
    
    // Increment turn (half-turns every 0.5 seconds)
    gameState.turn++
    
    // Generate armies for each player's king only on full turns (even turn numbers)
    if (gameState.turn % 2 === 0) {
      gameState.players.forEach(player => {
        gameState.armies[player.kingX][player.kingY] += 1
      })
      
      // Generate armies for captured villages
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
          if (gameState.villages[i][j] && gameState.map[i][j] >= 2) {
            // This is a captured village, generate 1 army
            gameState.armies[i][j] += 1
          }
        }
      }
      
      // Every 25 turns (25 full turns = 50 half-turns), add 1 army to all player territories
      if (gameState.turn % 50 === 0 && gameState.turn > 0) {
        for (let i = 0; i < 20; i++) {
          for (let j = 0; j < 20; j++) {
            const value = gameState.map[i][j]
            if (value >= 2) { // Player territory
              gameState.armies[i][j] += 1
            }
          }
        }
        console.log(`Turn ${gameState.turn}: Added 1 army to all player territories`)
      }
    }
    
    broadcastGameState()
  }, 500) // Half-turns every 0.5 seconds
}

function broadcastGameState() {
  const gameStateData = {
    type: 'gameState',
    data: {
      map: gameState.map,
      armies: gameState.armies,
      players: Array.from(gameState.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        territories: p.territories,
        kingX: p.kingX,
        kingY: p.kingY
      })),
      gameStarted: gameState.gameStarted,
      turn: gameState.turn
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
    armies: gameState.armies,
    players: Array.from(gameState.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      territories: p.territories,
      kingX: p.kingX,
      kingY: p.kingY
    })),
    gameStarted: gameState.gameStarted,
    turn: gameState.turn
  })
})

// Initialize the map
initializeMap()

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`MopMop server running on port ${PORT}`)
  console.log(`WebSocket server ready for connections`)
})
