import { useState, useEffect, useRef } from 'react'

interface Player {
  id: string
  name: string
  color: string
  territories: number
  kingX: number
  kingY: number
}

interface GameState {
  map: number[][]
  armies: number[][]
  players: Player[]
  gameStarted: boolean
  turn: number
}

interface SelectedTile {
  x: number
  y: number
  playerId: string
}

interface QueuedMove {
  fromX: number
  fromY: number
  toX: number
  toY: number
  isSplit?: boolean
}

function App() {
  const [gameState, setGameState] = useState<GameState>({
    map: Array(20).fill(null).map(() => Array(20).fill(0)),
    armies: Array(20).fill(null).map(() => Array(20).fill(0)),
    players: [],
    gameStarted: false,
    turn: 0
  })
  
  const [playerName, setPlayerName] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [playerId, setPlayerId] = useState('')
  const [playerColor, setPlayerColor] = useState('')
  const [selectedTile, setSelectedTile] = useState<SelectedTile | null>(null)
  const [moveQueue, setMoveQueue] = useState<QueuedMove[]>([])
  const [originalPosition, setOriginalPosition] = useState<{x: number, y: number} | null>(null)
  const [currentArmyPosition, setCurrentArmyPosition] = useState<{x: number, y: number} | null>(null)
  const [actualArmyPosition, setActualArmyPosition] = useState<{x: number, y: number} | null>(null)
  const [lastConfirmedPosition, setLastConfirmedPosition] = useState<{x: number, y: number} | null>(null)
  const lastConfirmedPositionRef = useRef<{x: number, y: number} | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [chatMessages, setChatMessages] = useState<Array<{id: string, player: string, message: string, timestamp: number}>>([])
  const [chatInput, setChatInput] = useState('')
  const [mountainSpawnRate, setMountainSpawnRate] = useState(20)
  const [villageSpawnRate, setVillageSpawnRate] = useState(3)
  const [gameOverData, setGameOverData] = useState<{won: boolean, winner: string, loser: string} | null>(null)
  const [previewMap, setPreviewMap] = useState<number[][]>(Array(20).fill(null).map(() => Array(20).fill(0)))
  const [replayData, setReplayData] = useState<Array<{turn: number, map: number[][], armies: number[][], players: any[]}>>([])
  const [isReplaying, setIsReplaying] = useState(false)
  const [replayTurn, setReplayTurn] = useState(0)
  const [isAutoplay, setIsAutoplay] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(1)
  const [isSplitMode, setIsSplitMode] = useState(false)
  const [rightClickMenu, setRightClickMenu] = useState<{x: number, y: number, tileX: number, tileY: number} | null>(null)
  const [gameMode, setGameMode] = useState<'main' | 'ffa' | '1v1' | '2v2' | 'custom'>('main')
  const [lobbyPlayers, setLobbyPlayers] = useState<Array<{id: string, name: string, color: string}>>([])
  const [forceStartVotes, setForceStartVotes] = useState<Set<string>>(new Set())
  const [gameModeData, setGameModeData] = useState<{mode: string, maxPlayers: number, currentPlayers: number} | null>(null)
  const [currentPage, setCurrentPage] = useState<'main' | 'settings' | 'profile'>('main')
  const [isSpectator, setIsSpectator] = useState(false)
  const [playerStats, setPlayerStats] = useState<{
    totalGames: number,
    totalWins: number,
    totalLosses: number,
    gameModeStats: {
      ffa: { games: number, wins: number, losses: number },
      '1v1': { games: number, wins: number, losses: number },
      '2v2': { games: number, wins: number, losses: number }
    },
    matchHistory: Array<{
      id: string,
      gameMode: string,
      result: 'win' | 'loss',
      opponent: string,
      date: string,
      replayData: any
    }>
  }>({
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    gameModeStats: {
      ffa: { games: 0, wins: 0, losses: 0 },
      '1v1': { games: 0, wins: 0, losses: 0 },
      '2v2': { games: 0, wins: 0, losses: 0 }
    },
    matchHistory: []
  })
  const wsRef = useRef<WebSocket | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)

  // Update preview map when sliders change
  useEffect(() => {
    if (!gameState.gameStarted) {
      setPreviewMap(generatePreviewMap(mountainSpawnRate, villageSpawnRate))
    }
  }, [mountainSpawnRate, villageSpawnRate, gameState.gameStarted])

  // Capture game state for replay
  useEffect(() => {
    if (gameState.gameStarted && !isReplaying) {
      setReplayData(prev => [...prev, {
        turn: gameState.turn,
        map: gameState.map.map(row => [...row]),
        armies: gameState.armies.map(row => [...row]),
        players: [...gameState.players]
      }])
    }
  }, [gameState.turn, gameState.gameStarted, isReplaying])


  // Autoplay functionality
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isAutoplay && isReplaying && replayTurn < replayData.length - 1) {
      const delay = 1000 / replaySpeed // Convert speed to delay in ms
      interval = setInterval(() => {
        setReplayTurn(prev => {
          if (prev < replayData.length - 1) {
            return prev + 1
          } else {
            setIsAutoplay(false) // Stop autoplay when reaching the end
            return prev
          }
        })
      }, delay)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isAutoplay, isReplaying, replayTurn, replayData.length, replaySpeed])

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  // Close right-click menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setRightClickMenu(null)
    }
    
    if (rightClickMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [rightClickMenu])

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('Connected to server')
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('Received message:', message.type, message.data)
      
      switch (message.type) {
        case 'gameState':
          setGameState(message.data)
          break
        case 'joinSuccess':
          setPlayerId(message.data.playerId)
          setPlayerColor(message.data.color)
          setIsConnected(true)
          break
        case 'error':
          console.log('Game error:', message.message)
          break
        case 'moveResult':
          // Always update lastConfirmedPosition for successful moves (regardless of selectedTile)
          if (message.data.success) {
            // Update to the latest confirmed position (where army actually is)
            const newPosition = { x: message.data.toX, y: message.data.toY }
            setLastConfirmedPosition(newPosition)
            lastConfirmedPositionRef.current = newPosition
            
            // Update selection if we have a selectedTile
            if (selectedTile) {
              setSelectedTile({
                x: message.data.toX,
                y: message.data.toY,
                playerId: selectedTile.playerId
              })
              setCurrentArmyPosition({
                x: message.data.toX,
                y: message.data.toY
              })
              setActualArmyPosition({
                x: message.data.toX,
                y: message.data.toY
              })
            }
          }
          break
        case 'gameOver':
          // Handle game over - show game over screen
          setGameOverData({
            won: message.data.won,
            winner: message.data.winner,
            loser: message.data.loser
          })
          
          // Update player stats
          const currentGameMode = gameModeData?.mode || 'ffa'
          setPlayerStats(prev => {
            const newStats = { ...prev }
            newStats.totalGames += 1
            if (message.data.won) {
              newStats.totalWins += 1
              newStats.gameModeStats[currentGameMode as keyof typeof newStats.gameModeStats].wins += 1
            } else {
              newStats.totalLosses += 1
              newStats.gameModeStats[currentGameMode as keyof typeof newStats.gameModeStats].losses += 1
            }
            newStats.gameModeStats[currentGameMode as keyof typeof newStats.gameModeStats].games += 1
            
            // Add to match history
            const match = {
              id: Date.now().toString(),
              gameMode: currentGameMode,
              result: message.data.won ? 'win' as const : 'loss' as const,
              opponent: message.data.won ? message.data.loser : message.data.winner,
              date: new Date().toLocaleDateString(),
              replayData: replayData // Current replay data
            }
            newStats.matchHistory.unshift(match)
            
            // Keep only last 50 matches
            if (newStats.matchHistory.length > 50) {
              newStats.matchHistory = newStats.matchHistory.slice(0, 50)
            }
            
            return newStats
          })
          break
        case 'chatMessage':
          // Handle incoming chat message
          const newMessage = {
            id: Date.now().toString(),
            player: message.data.player,
            message: message.data.message,
            timestamp: message.data.timestamp
          }
          setChatMessages(prev => [...prev, newMessage])
          break
        case 'lobbyJoined':
          setPlayerId(message.data.playerId)
          setPlayerColor(message.data.color)
          setGameModeData({
            mode: message.data.gameMode,
            maxPlayers: message.data.maxPlayers,
            currentPlayers: message.data.currentPlayers
          })
          setLobbyPlayers(message.data.players)
          break
        case 'lobbyUpdate':
          setGameModeData(prev => prev ? {
            ...prev,
            currentPlayers: message.data.currentPlayers
          } : null)
          setLobbyPlayers(message.data.players)
          break
        case 'forceStartUpdate':
          setForceStartVotes(new Set(message.data.votes))
          break
        case 'gameStarting':
          setGameModeData(null)
          setLobbyPlayers([])
          setForceStartVotes(new Set())
          break
        case 'nameTaken':
          // Show error message for taken name
          setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            player: 'System',
            message: 'Name already taken! Please choose a different name.',
            timestamp: Date.now()
          }])
          break
        case 'spectatorJoined':
          setIsSpectator(true)
          setPlayerId(message.data.playerId)
          setPlayerColor('#888888') // Gray color for spectators
          break
      }
    }

    ws.onclose = () => {
      console.log('Disconnected from server')
      setIsConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [])

  // Keyboard controls for WASD movement and queue management
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameState.gameStarted || !wsRef.current) return
      
      // Don't handle game controls if user is typing in chat
      if (event.target instanceof HTMLInputElement) return
      
      switch (event.key.toLowerCase()) {
        case 'q':
          // Reset move queue and selection to latest confirmed position
          setMoveQueue([])
          
          const currentPos = lastConfirmedPositionRef.current
          if (currentPos) {
            // Go back to where the army actually is (latest confirmed position)
            setSelectedTile({ x: currentPos.x, y: currentPos.y, playerId })
            setCurrentArmyPosition({ x: currentPos.x, y: currentPos.y })
          } else if (originalPosition) {
            // If no moves have been confirmed yet, go back to original selected tile
            setSelectedTile({ x: originalPosition.x, y: originalPosition.y, playerId })
            setCurrentArmyPosition({ x: originalPosition.x, y: originalPosition.y })
          }
          return
        case 'z':
          // Toggle split mode
          if (selectedTile) {
            setIsSplitMode(prev => !prev)
          }
          return
        case ' ':
          // Toggle autoplay in replay mode
          if (isReplaying) {
            setIsAutoplay(prev => !prev)
          }
          return
        case 'e':
          // Undo last move in queue
          setMoveQueue(prev => {
            if (prev.length === 0) return prev // Nothing to undo
            
            const newQueue = prev.slice(0, -1)
            const lastMove = prev[prev.length - 1]
            
            // Update selection to the "from" position of the undone move
            setSelectedTile({ x: lastMove.fromX, y: lastMove.fromY, playerId })
            setCurrentArmyPosition({ x: lastMove.fromX, y: lastMove.fromY })
            
            return newQueue
          })
          return
        case 'w':
        case 's':
        case 'a':
        case 'd':
          if (!selectedTile) return
          
          const { x, y } = selectedTile
          let newX = x
          let newY = y
          
          switch (event.key.toLowerCase()) {
            case 'w':
              newX = Math.max(0, x - 1) // Up
              break
            case 's':
              newX = Math.min(19, x + 1) // Down
              break
            case 'a':
              newY = Math.max(0, y - 1) // Left
              break
            case 'd':
              newY = Math.min(19, y + 1) // Right
              break
          }
          
          // Only queue move if the target is different from source and not a wall
          if ((newX !== x || newY !== y) && gameState.map[newX][newY] !== -1) {
            const newMove: QueuedMove = {
              fromX: x,
              fromY: y,
              toX: newX,
              toY: newY,
              isSplit: isSplitMode
            }
            
            // Add move to queue
            setMoveQueue(prev => [...prev, newMove])
            
            // Update selection to follow the move (simple approach)
            setSelectedTile({ x: newX, y: newY, playerId })
            setCurrentArmyPosition({ x: newX, y: newY })
            
            // Turn off split mode after using it
            if (isSplitMode) {
              setIsSplitMode(false)
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedTile, gameState.gameStarted, playerId])

  // Auto-send one move per half-turn
  useEffect(() => {
    if (!gameState.gameStarted || moveQueue.length === 0 || !wsRef.current) return

    // Send only the first move in the queue
    const moveToSend = moveQueue[0]
    wsRef.current.send(JSON.stringify({
      type: 'queueMoves',
      data: {
        moves: [moveToSend],
        playerId: playerId
      }
    }))

    // Remove the first move from the queue
    setMoveQueue(prev => prev.slice(1))
  }, [gameState.turn, gameState.gameStarted, playerId])

  // Zoom and pan handlers
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)))
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left click
        setIsDragging(true)
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart, pan])

  const handleJoinGame = () => {
    if (!playerName.trim() || wsRef.current || gameMode === 'main') return
    
    wsRef.current = new WebSocket('ws://localhost:3001')
    
    wsRef.current.onopen = () => {
      setIsConnected(true)
      wsRef.current?.send(JSON.stringify({
        type: 'joinLobby',
        data: { 
          name: playerName.trim(),
          gameMode: gameMode
        }
      }))
    }
    
    wsRef.current.onclose = () => {
      setIsConnected(false)
      wsRef.current = null
      setGameModeData(null)
      setLobbyPlayers([])
      setForceStartVotes(new Set())
    }
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
      wsRef.current = null
      setGameModeData(null)
      setLobbyPlayers([])
      setForceStartVotes(new Set())
    }
  }

  const handleCellClick = (x: number, y: number, event?: React.MouseEvent) => {
    if (!gameState.gameStarted || !wsRef.current || isSpectator) return
    
    // Handle right-click for menu
    if (event?.button === 2) {
      event.preventDefault()
      const playerIndex = Array.from(gameState.players).findIndex(p => p.id === playerId)
      const playerTerritoryValue = playerIndex + 2
      
      if (gameState.map[x][y] === playerTerritoryValue) {
        setRightClickMenu({
          x: event.clientX,
          y: event.clientY,
          tileX: x,
          tileY: y
        })
      }
      return
    }
    
    // Check if this tile belongs to the current player
    const playerIndex = Array.from(gameState.players).findIndex(p => p.id === playerId)
    const playerTerritoryValue = playerIndex + 2
    
    if (gameState.map[x][y] === playerTerritoryValue) {
      // Select this tile for army movement
      setSelectedTile({ x, y, playerId })
      // Set the original position for smart selection tracking
      setOriginalPosition({ x, y })
      setCurrentArmyPosition({ x, y })
      setActualArmyPosition({ x, y })
      // Initialize lastConfirmedPosition to this position (where army currently is)
      const newPosition = { x, y }
      setLastConfirmedPosition(newPosition)
      lastConfirmedPositionRef.current = newPosition
      // Clear any existing move queue when selecting a new tile
      setMoveQueue([])
    }
  }

  const handleStartGame = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'startGame',
        data: {
          mountainSpawnRate,
          villageSpawnRate
        }
      }))
    }
  }

  const handleQuit = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'quit',
        data: { playerId }
      }))
    }
    // Reset to main menu
    setIsConnected(false)
    setSelectedTile(null)
    setMoveQueue([])
    setOriginalPosition(null)
    setCurrentArmyPosition(null)
    setActualArmyPosition(null)
  }

  const handleChatSend = () => {
    if (chatInput.trim() && wsRef.current) {
      // Send chat message to server
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        data: { playerId, message: chatInput.trim() }
      }))
      setChatInput('')
    }
  }

  const handlePurchaseWeapon = (weaponType: 'cannon' | 'mortar') => {
    if (!rightClickMenu || !wsRef.current) return
    
    wsRef.current.send(JSON.stringify({
      type: 'purchaseWeapon',
      data: {
        playerId,
        x: rightClickMenu.tileX,
        y: rightClickMenu.tileY,
        weaponType
      }
    }))
    
    setRightClickMenu(null)
  }

  const handleBackToMenu = () => {
    setGameOverData(null)
    setIsConnected(false)
    setSelectedTile(null)
    setMoveQueue([])
    setOriginalPosition(null)
    setCurrentArmyPosition(null)
    setActualArmyPosition(null)
    setLastConfirmedPosition(null)
    setChatMessages([])
  }

  const handleWatchReplay = () => {
    if (replayData.length > 0) {
      setIsReplaying(true)
      setReplayTurn(0)
      setGameOverData(null)
    }
  }

  const handleReplayNext = () => {
    if (replayTurn < replayData.length - 1) {
      setReplayTurn(prev => prev + 1)
    }
  }

  const handleReplayPrev = () => {
    if (replayTurn > 0) {
      setReplayTurn(prev => prev - 1)
    }
  }

  const handleReplayBackToMenu = () => {
    setIsReplaying(false)
    setReplayTurn(0)
    setReplayData([])
    setGameOverData(null)
    setIsAutoplay(false)
    setReplaySpeed(1)
    setIsConnected(false)
    setSelectedTile(null)
    setMoveQueue([])
    setOriginalPosition(null)
    setCurrentArmyPosition(null)
    setActualArmyPosition(null)
    setLastConfirmedPosition(null)
    setChatMessages([])
  }

  const generatePreviewMap = (mountainRate: number, villageRate: number) => {
    const newMap = Array(20).fill(null).map(() => Array(20).fill(0))
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        const rand = Math.random() * 100
        if (rand < mountainRate) {
          newMap[i][j] = -1 // Mountain
        } else if (rand < mountainRate + villageRate) {
          newMap[i][j] = -2 // Village
        }
      }
    }
    return newMap
  }

  const getCellColor = (value: number, x: number, y: number) => {
    if (value === -1) return 'bg-gray-600' // Mountain
    if (value === -2) return 'bg-yellow-600' // Village
    if (value === 0) return 'bg-gray-800' // Empty
    
    // Player territories (value >= 2)
    if (value >= 2) {
      const playerIndex = value - 2
      const player = gameState.players[playerIndex]
      if (player) {
        // Use inline style for colors since Tailwind dynamic classes don't work
        return ''
      }
    }
    
    return 'bg-gray-800' // Default to empty
  }

  const getCellStyle = (value: number, x: number, y: number) => {
    if (value >= 2) {
      const playerIndex = value - 2
      const player = gameState.players[playerIndex]
      if (player) {
        return { backgroundColor: player.color }
      }
    }
    return {}
  }

  const isKingTile = (x: number, y: number) => {
    return gameState.players.some(player => player.kingX === x && player.kingY === y)
  }

  const getPlayerFromTile = (x: number, y: number) => {
    const value = gameState.map[x][y]
    if (value >= 2) {
      const playerIndex = value - 2
      return gameState.players[playerIndex]
    }
    return null
  }

  const isSelected = (x: number, y: number) => {
    return selectedTile && selectedTile.x === x && selectedTile.y === y
  }

  const getQueuedMoveArrow = (x: number, y: number) => {
    const queuedMove = moveQueue.find(move => move.fromX === x && move.fromY === y)
    if (!queuedMove) {
      // If no queued move but split mode is active on this tile, show "50%"
      if (isSplitMode && selectedTile && selectedTile.x === x && selectedTile.y === y) {
        return '50%'
      }
      return null
    }
    
    // If it's a split move, show "50%"
    if (queuedMove.isSplit) return '50%'
    
    const dx = queuedMove.toX - queuedMove.fromX
    const dy = queuedMove.toY - queuedMove.fromY
    
    if (dx === 1 && dy === 0) return '↓' // Down (S)
    if (dx === -1 && dy === 0) return '↑' // Up (W)
    if (dx === 0 && dy === 1) return '→' // Right (D)
    if (dx === 0 && dy === -1) return '←' // Left (A)
    
    return null
  }

  const isTileVisible = (x: number, y: number) => {
    if (!gameState.gameStarted) return true // Show all tiles in preview
    
    // Always show walls/mountains (terrain features)
    if (gameState.map[x][y] === -1) return true
    
    // Find player's territories
    const playerIndex = Array.from(gameState.players).findIndex(p => p.id === playerId)
    if (playerIndex === -1) return false
    
    const playerTerritoryValue = playerIndex + 2
    
    // Check if this tile belongs to the player
    if (gameState.map[x][y] === playerTerritoryValue) return true
    
    // Check if any adjacent tile belongs to the player (fog of war - see 1 tile around your territory)
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
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

  const getPlayerStats = () => {
    return gameState.players.map(player => {
      const playerIndex = Array.from(gameState.players).indexOf(player)
      const playerTerritoryValue = playerIndex + 2
      
      let armyCount = 0
      let landCount = 0
      
      for (let x = 0; x < 20; x++) {
        for (let y = 0; y < 20; y++) {
          if (gameState.map[x][y] === playerTerritoryValue) {
            landCount++
            armyCount += gameState.armies[x][y]
          }
        }
      }
      
      return {
        ...player,
        armyCount,
        landCount
      }
    }).sort((a, b) => b.landCount - a.landCount) // Sort by land count
  }



  return (
    <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {!isConnected ? (
        // Main Menu Screen
        <div className="flex items-center justify-center h-full relative">
          {/* Settings and Profile Buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setCurrentPage('settings')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setCurrentPage('profile')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              👤 Profile
            </button>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8 text-blue-400">MopMop</h1>
            <p className="text-gray-400 mb-8">A real-time strategy game inspired by generals.io</p>
            
            {gameMode === 'main' ? (
              // Main Menu
              <div className="space-y-4">
                <div className="flex gap-4 mb-6">
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-lg"
                  />
                </div>
                <button
                  onClick={() => setGameMode('ffa')}
                  disabled={!playerName.trim()}
                  className="w-48 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors text-lg font-semibold"
                >
                  Play
                </button>
              </div>
            ) : (
              // Game Mode Selection
              <div className="space-y-4">
                <div className="flex gap-4 mb-6">
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <button
                    onClick={() => {
                      setGameMode('ffa')
                      handleJoinGame()
                    }}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded transition-colors text-lg font-semibold"
                  >
                    FFA
                    <div className="text-sm text-gray-300">Up to 8 players</div>
                  </button>
                  <button
                    onClick={() => {
                      setGameMode('1v1')
                      handleJoinGame()
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-lg font-semibold"
                  >
                    1v1
                    <div className="text-sm text-gray-300">2 players</div>
                  </button>
                  <button
                    onClick={() => {
                      setGameMode('2v2')
                      handleJoinGame()
                    }}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded transition-colors text-lg font-semibold"
                  >
                    2v2
                    <div className="text-sm text-gray-300">4 players</div>
                  </button>
                  <button
                    disabled
                    className="px-6 py-3 bg-gray-600 cursor-not-allowed rounded text-lg font-semibold opacity-50"
                  >
                    Custom
                    <div className="text-sm text-gray-400">Coming soon</div>
                  </button>
                </div>
                <button
                  onClick={() => setGameMode('main')}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      ) : currentPage === 'settings' ? (
        // Settings Page
        <div className="flex items-center justify-center h-full">
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-blue-400">Settings</h2>
              <button
                onClick={() => setCurrentPage('main')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              >
                Back
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Audio Volume</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="50"
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Graphics Quality</label>
                <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span>Enable Sound Effects</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span>Enable Music</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span>Auto-queue moves</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : currentPage === 'profile' ? (
        // Profile Page
        <div className="flex items-center justify-center h-full">
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-blue-400">Profile</h2>
              <button
                onClick={() => setCurrentPage('main')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              >
                Back
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Player Info */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Player Information</h3>
                <div className="space-y-2">
                  <div><span className="font-medium">Name:</span> {playerName}</div>
                  <div><span className="font-medium">Total Games:</span> {playerStats.totalGames}</div>
                  <div><span className="font-medium">Total Wins:</span> {playerStats.totalWins}</div>
                  <div><span className="font-medium">Total Losses:</span> {playerStats.totalLosses}</div>
                  <div><span className="font-medium">Win Rate:</span> {
                    playerStats.totalGames > 0 
                      ? `${((playerStats.totalWins / playerStats.totalGames) * 100).toFixed(1)}%`
                      : '0%'
                  }</div>
                </div>
              </div>
              
              {/* Game Mode Stats */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Game Mode Statistics</h3>
                <div className="space-y-3">
                  {Object.entries(playerStats.gameModeStats).map(([mode, stats]) => (
                    <div key={mode} className="border-b border-gray-600 pb-2">
                      <div className="font-medium capitalize">{mode}</div>
                      <div className="text-sm text-gray-300">
                        Games: {stats.games} | Wins: {stats.wins} | Losses: {stats.losses}
                      </div>
                      <div className="text-sm text-gray-300">
                        Win Rate: {stats.games > 0 ? `${((stats.wins / stats.games) * 100).toFixed(1)}%` : '0%'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Match History */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Match History</h3>
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                {playerStats.matchHistory.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">No matches played yet</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {playerStats.matchHistory.map((match) => (
                      <div key={match.id} className="flex items-center justify-between p-3 border-b border-gray-600 hover:bg-gray-600 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            match.result === 'win' ? 'bg-green-600' : 'bg-red-600'
                          }`}>
                            {match.result.toUpperCase()}
                          </span>
                          <div>
                            <div className="font-medium capitalize">{match.gameMode}</div>
                            <div className="text-sm text-gray-300">vs {match.opponent}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">{match.date}</span>
                          <button
                            onClick={() => {
                              setReplayData(match.replayData)
                              setIsReplaying(true)
                              setCurrentPage('main')
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                          >
                            Watch Replay
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : gameModeData ? (
        // Loading/Lobby Screen
        <div className="flex items-center justify-center h-full">
          <div className="text-center bg-gray-800 p-8 rounded-lg border border-gray-700 max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">
              {gameModeData.mode.toUpperCase()} Lobby
            </h2>
            <div className="mb-6">
              <div className="text-lg mb-2">
                {gameModeData.currentPlayers} out of {gameModeData.maxPlayers} players
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(gameModeData.currentPlayers / gameModeData.maxPlayers) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Players in lobby:</h3>
              <div className="space-y-1">
                {lobbyPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: player.color }}
                      ></div>
                      <span>{player.name}</span>
                    </div>
                    {forceStartVotes.has(player.id) && (
                      <span className="text-green-400 text-sm">✓ Ready</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (wsRef.current) {
                    wsRef.current.send(JSON.stringify({
                      type: 'forceStart',
                      data: { playerId }
                    }))
                  }
                }}
                className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded transition-colors"
              >
                {forceStartVotes.has(playerId) ? 'Cancel Force Start' : 'Force Start'}
              </button>
              <button
                onClick={() => {
                  if (wsRef.current) {
                    wsRef.current.close()
                  }
                  setGameMode('main')
                  setGameModeData(null)
                  setLobbyPlayers([])
                  setForceStartVotes(new Set())
                }}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              >
                Leave Lobby
              </button>
            </div>
          </div>
        </div>
      ) : isReplaying ? (
        // Replay Screen
        <div className="h-full flex flex-col">
          {/* Replay Header */}
          <div className="bg-gray-800 p-2 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-blue-400 font-semibold">Replay Mode</span>
              <span className="text-sm text-gray-300">
                Turn {replayData[replayTurn]?.turn || 0} / {replayData.length - 1}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleReplayPrev}
                disabled={replayTurn === 0 || isAutoplay}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 rounded text-sm transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={handleReplayNext}
                disabled={replayTurn >= replayData.length - 1 || isAutoplay}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 rounded text-sm transition-colors"
              >
                Next →
              </button>
              <button
                onClick={() => setIsAutoplay(!isAutoplay)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  isAutoplay 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isAutoplay ? 'Stop' : 'Autoplay'}
              </button>
              <select
                value={replaySpeed}
                onChange={(e) => setReplaySpeed(Number(e.target.value))}
                className="px-2 py-1 bg-gray-700 text-white rounded text-sm"
                disabled={isAutoplay}
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
                <option value={10}>10x</option>
              </select>
              <button
                onClick={handleReplayBackToMenu}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
              >
                Back to Menu
              </button>
            </div>
          </div>

          {/* Replay Map */}
          <div className="flex-1 flex items-center justify-center bg-gray-900 p-1 relative overflow-hidden">
            <div 
              className="grid gap-0.5 absolute"
              style={{ 
                gridTemplateColumns: 'repeat(20, 1fr)',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center'
              }}
            >
              {replayData[replayTurn]?.map.map((row, x) =>
                row.map((cell, y) => {
                  const armyCount = replayData[replayTurn]?.armies[x][y] || 0
                  const player = replayData[replayTurn]?.players.find(p => {
                    const playerIndex = replayData[replayTurn]?.players.indexOf(p)
                    return replayData[replayTurn]?.map[x][y] === playerIndex + 2
                  })
                  const isKing = player && replayData[replayTurn]?.map[x][y] === replayData[replayTurn]?.players.indexOf(player) + 2 && x === 0 && y === 0
                  const visible = isTileVisible(x, y)
                  
                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`
                        w-10 h-10 border border-gray-700 cursor-pointer transition-all duration-150 
                        ${visible ? getCellColor(cell, x, y) : (cell === -2 ? 'bg-gray-600' : 'bg-gray-900')} 
                        flex items-center justify-center text-sm font-bold relative
                        ${armyCount > 0 && visible ? 'text-white' : 'text-transparent'}
                      `}
                      style={visible ? getCellStyle(cell, x, y) : {}}
                    >
                      {armyCount > 0 && visible && (
                        <span className="relative">
                          {armyCount}
                          {isKing && (
                            <span className="absolute -top-1 -right-1 text-xs">👑</span>
                          )}
                          {cell === -2 && armyCount > 0 && (
                            <span className="absolute -top-1 -right-1 text-xs">🏘️</span>
                          )}
                        </span>
                      )}
                      {armyCount === 0 && cell === -2 && visible && (
                        <span className="absolute -top-1 -right-1 text-xs">🏘️</span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : gameOverData ? (
        // Game Over Screen
        <div className="h-full flex items-center justify-center bg-gray-900">
          <div className="text-center bg-gray-800 p-8 rounded-lg border border-gray-700">
            <div className="text-6xl mb-4">
              {gameOverData.won ? '🎉' : '💀'}
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {gameOverData.won ? 'Victory!' : 'Defeat!'}
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              {gameOverData.won 
                ? `You defeated ${gameOverData.loser}!` 
                : `${gameOverData.winner} defeated you!`}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleBackToMenu}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Back to Menu
              </button>
              <button
                onClick={handleWatchReplay}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Watch Replay
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Game Screen
        <div className="h-full flex flex-col">
          {/* Minimal Header */}
          <div className="bg-gray-800 p-2 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className={`font-semibold ${isSpectator ? 'text-gray-400' : 'text-green-400'}`}>
                {playerName} {isSpectator && '(Spectator)'}
              </span>
              <div className={`w-2 h-2 rounded-full ${isSpectator ? 'bg-gray-500' : 'bg-green-500'}`}></div>
              {gameState.gameStarted && (
                <span className="text-blue-400 font-bold">
                  Turn {Math.floor(gameState.turn / 2) + 1}{gameState.turn % 2 === 1 ? '.' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">{gameState.players.length} players</span>
              {gameState.gameStarted && (
                <button
                  onClick={handleQuit}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                >
                  Quit
                </button>
              )}
              {!gameState.gameStarted && gameState.players.length >= 2 && (
                <button
                  onClick={handleStartGame}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                >
                  Start Game
                </button>
              )}
            </div>
          </div>

          {/* Map Settings - Only show when game not started */}
          {!gameState.gameStarted && (
            <div className="bg-gray-800 p-4 border-b border-gray-700">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <label className="block text-sm text-gray-400 mb-2">
                    Mountains: {mountainSpawnRate}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={mountainSpawnRate}
                    onChange={(e) => setMountainSpawnRate(Number(e.target.value))}
                    className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="text-center">
                  <label className="block text-sm text-gray-400 mb-2">
                    Villages: {villageSpawnRate}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={villageSpawnRate}
                    onChange={(e) => setVillageSpawnRate(Number(e.target.value))}
                    className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Game Map */}
          <div className="flex-1 flex items-center justify-center bg-gray-900 p-1 relative overflow-hidden">
            <div 
              className="grid gap-0.5 absolute"
              style={{ 
                gridTemplateColumns: 'repeat(20, 1fr)',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center'
              }}
            >
              {(gameState.gameStarted ? gameState.map : previewMap).map((row, x) =>
                row.map((cell, y) => {
                  const armyCount = gameState.gameStarted ? gameState.armies[x][y] : 0
                  const player = gameState.gameStarted ? getPlayerFromTile(x, y) : null
                  const isKing = gameState.gameStarted ? isKingTile(x, y) : false
                  const selected = isSelected(x, y)
                  const visible = isTileVisible(x, y)
                  
                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`
                        w-10 h-10 border border-gray-700 cursor-pointer transition-all duration-150 
                        ${visible ? getCellColor(cell, x, y) : (cell === -2 ? 'bg-gray-600' : 'bg-gray-900')} 
                        ${selected ? 'ring-2 ring-yellow-400 ring-opacity-75' : ''}
                        ${gameState.gameStarted ? 'hover:brightness-125' : 'cursor-not-allowed opacity-50'}
                        flex items-center justify-center text-sm font-bold relative
                        ${armyCount > 0 && visible ? 'text-white' : 'text-transparent'}
                      `}
                      style={visible ? getCellStyle(cell, x, y) : {}}
                      onClick={(e) => handleCellClick(x, y, e)}
                      onContextMenu={(e) => handleCellClick(x, y, e)}
                      title={visible ? `(${x}, ${y}) - ${armyCount} armies` : 'Unknown territory'}
                    >
                      {visible && isKing && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs opacity-60">
                          👑
                        </div>
                      )}
                      {visible && cell === -2 && armyCount > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs opacity-60">
                          🏘️
                        </div>
                      )}
                      {visible && armyCount > 0 && (
                        <div className="relative z-10">
                          {armyCount}
                        </div>
                      )}
                      {visible && getQueuedMoveArrow(x, y) && (
                        <div className="absolute top-0 right-0 text-xs text-yellow-400 font-bold z-20">
                          {getQueuedMoveArrow(x, y)}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Minimal Controls Info */}
          {gameState.gameStarted && (
            <div className="bg-gray-800 p-2 text-center text-sm text-gray-300">
              {selectedTile ? (
                <div>
                  Selected: ({selectedTile.x}, {selectedTile.y}) - WASD: Queue moves | Q: Reset queue | E: Undo last move | Z: Split mode {isSplitMode ? '(ON)' : '(OFF)'}
                </div>
              ) : (
                <div>Click a tile to select it, then use WASD to queue moves</div>
              )}
            </div>
          )}

          {/* Scoreboard */}
          {gameState.gameStarted && (
            <div className="absolute top-20 right-4 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white">Scoreboard</h3>
                <p className="text-xs text-gray-400">Ranking coming soon</p>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="font-semibold text-gray-300">Player</div>
                  <div className="font-semibold text-gray-300">Army</div>
                  <div className="font-semibold text-gray-300">Land</div>
                </div>
                {getPlayerStats().map((player, index) => (
                  <div key={player.id} className="grid grid-cols-3 gap-2 text-xs py-1">
                    <div 
                      className="px-2 py-1 rounded text-white font-semibold"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name}
                    </div>
                    <div className="bg-white text-gray-800 px-2 py-1 rounded text-center font-semibold">
                      {player.armyCount}
                    </div>
                    <div className="bg-white text-gray-800 px-2 py-1 rounded text-center font-semibold">
                      {player.landCount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right-click Menu */}
          {rightClickMenu && (
            <div 
              className="absolute bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50"
              style={{
                left: rightClickMenu.x,
                top: rightClickMenu.y
              }}
            >
              <div className="p-2">
                <div className="text-xs text-gray-300 mb-2">Purchase Weapon:</div>
                {(() => {
                  const currentArmies = gameState.armies[rightClickMenu.tileX][rightClickMenu.tileY]
                  const canAfford = currentArmies >= 200
                  return (
                    <>
                      <button
                        onClick={() => handlePurchaseWeapon('cannon')}
                        disabled={!canAfford}
                        className={`w-full text-left px-3 py-2 rounded text-sm ${
                          canAfford 
                            ? 'text-white hover:bg-gray-700' 
                            : 'text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="font-semibold">Cannon</div>
                        <div className="text-xs text-gray-400">Cost: 200 armies</div>
                        {!canAfford && <div className="text-xs text-red-400">Not enough armies</div>}
                      </button>
                      <button
                        onClick={() => handlePurchaseWeapon('mortar')}
                        disabled={!canAfford}
                        className={`w-full text-left px-3 py-2 rounded text-sm ${
                          canAfford 
                            ? 'text-white hover:bg-gray-700' 
                            : 'text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="font-semibold">Mortar</div>
                        <div className="text-xs text-gray-400">Cost: 200 armies</div>
                        {!canAfford && <div className="text-xs text-red-400">Not enough armies</div>}
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Chat System */}
          {gameState.gameStarted && (
            <div className="absolute bottom-4 right-4 w-80 bg-gray-800 rounded-lg shadow-lg">
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white">Chat</h3>
              </div>
              <div 
                ref={chatContainerRef}
                className="h-32 overflow-y-auto p-3 space-y-1"
              >
                {chatMessages.map(msg => (
                  <div key={msg.id} className="text-xs">
                    <span className="text-blue-400 font-semibold">{msg.player}:</span>
                    <span className="text-gray-300 ml-1">{msg.message}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-700 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleChatSend}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App

