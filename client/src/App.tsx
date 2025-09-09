import { useState, useEffect, useRef } from 'react'

interface Player {
  id: string
  name: string
  color: string
  territories: number
}

interface GameState {
  map: number[][]
  players: Player[]
  gameStarted: boolean
}

function App() {
  const [gameState, setGameState] = useState<GameState>({
    map: Array(20).fill(null).map(() => Array(20).fill(0)),
    players: [],
    gameStarted: false
  })
  
  const [playerName, setPlayerName] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [playerId, setPlayerId] = useState('')
  const [playerColor, setPlayerColor] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('Connected to server')
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
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
          alert(message.message)
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

  const handleJoinGame = () => {
    if (playerName.trim() && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'joinGame',
        data: { playerName: playerName.trim() }
      }))
    }
  }

  const handleCellClick = (x: number, y: number) => {
    if (!gameState.gameStarted || gameState.map[x][y] === -1 || !wsRef.current) return
    
    wsRef.current.send(JSON.stringify({
      type: 'claimTerritory',
      data: { x, y, playerId }
    }))
  }

  const handleStartGame = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'startGame'
      }))
    }
  }

  const getCellColor = (value: number, x: number, y: number) => {
    if (value === -1) return 'bg-gray-600' // Mountain
    if (value === 0) return 'bg-gray-800' // Empty
    if (value === 1) return 'bg-gray-400' // Neutral
    
    // Player territories (value >= 2)
    if (value >= 2) {
      const playerIndex = value - 2
      const player = gameState.players[playerIndex]
      if (player) {
        return `bg-[${player.color}]`
      }
    }
    
    return 'bg-gray-800'
  }

  const getCellType = (value: number) => {
    if (value === -1) return 'Mountain (Impassable)'
    if (value === 0) return 'Empty Territory'
    if (value === 1) return 'Neutral Territory'
    if (value >= 2) {
      const playerIndex = value - 2
      const player = gameState.players[playerIndex]
      return player ? `${player.name}'s Territory` : 'Player Territory'
    }
    return 'Unknown'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-400">MopMop</h1>
          <div className="flex items-center gap-4">
            {!isConnected ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                />
                <button
                  onClick={handleJoinGame}
                  className="px-4 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  Join Game
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-green-400">Connected as: {playerName}</span>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                {!gameState.gameStarted && gameState.players.length >= 2 && (
                  <button
                    onClick={handleStartGame}
                    className="px-4 py-1 bg-green-600 hover:bg-green-700 rounded transition-colors"
                  >
                    Start Game
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="max-w-6xl mx-auto p-4">
        {!isConnected ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Welcome to MopMop</h2>
              <p className="text-gray-400 mb-6">A real-time strategy game inspired by generals.io</p>
              <div className="bg-gray-800 p-6 rounded-lg max-w-md mx-auto">
                <h3 className="text-xl font-semibold mb-4">How to Play:</h3>
                <ul className="text-left text-gray-300 space-y-2">
                  <li>• Click on empty territories to claim them</li>
                  <li>• Expand your empire strategically</li>
                  <li>• Defend your territories from other players</li>
                  <li>• Last player standing wins!</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Game Status Banner */}
            <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 rounded-xl border border-blue-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-300">{gameState.players.length}</div>
                    <div className="text-sm text-gray-300">Players</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-300">
                      {gameState.players.reduce((total, player) => total + player.territories, 0)}
                    </div>
                    <div className="text-sm text-gray-300">Territories</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${gameState.gameStarted ? 'text-green-400' : 'text-yellow-400'}`}>
                    {gameState.gameStarted ? '🎮 Game Active' : '⏳ Waiting for Players'}
                  </div>
                  <div className="text-sm text-gray-300">
                    {gameState.gameStarted ? 'Click territories to claim them!' : 'Need 2+ players to start'}
                  </div>
                </div>
              </div>
            </div>

            {/* Player List */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold mb-3 text-blue-300">Players</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {gameState.players.map((player, index) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white" 
                      style={{ backgroundColor: player.color }}
                    ></div>
                    <div className="flex-1">
                      <div className="font-medium text-white">{player.name}</div>
                      <div className="text-sm text-gray-400">{player.territories} territories</div>
                    </div>
                    {player.id === playerId && (
                      <div className="text-xs bg-blue-600 text-white px-2 py-1 rounded">YOU</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Game Map */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-blue-300">Game Map</h3>
                <div className="text-sm text-gray-400">
                  {gameState.gameStarted ? 'Click to claim territories' : 'Game will start when 2+ players join'}
                </div>
              </div>
              
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-600">
                <div className="grid grid-cols-20 gap-0.5 max-w-fit mx-auto">
                  {gameState.map.map((row, x) =>
                    row.map((cell, y) => (
                      <div
                        key={`${x}-${y}`}
                        className={`w-5 h-5 border border-gray-700 cursor-pointer hover:scale-110 transition-all duration-150 ${getCellColor(cell, x, y)} ${
                          gameState.gameStarted ? 'hover:brightness-125' : 'cursor-not-allowed opacity-50'
                        }`}
                        onClick={() => handleCellClick(x, y)}
                        title={`Position: (${x}, ${y}) - ${getCellType(cell)}`}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Legend & Instructions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Legend */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-blue-300">Map Legend</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-600 border border-gray-500 rounded"></div>
                    <div>
                      <div className="font-medium text-white">Mountains</div>
                      <div className="text-sm text-gray-400">Impassable terrain</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-400 border border-gray-500 rounded"></div>
                    <div>
                      <div className="font-medium text-white">Neutral Territory</div>
                      <div className="text-sm text-gray-400">Can be claimed by anyone</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-800 border border-gray-500 rounded"></div>
                    <div>
                      <div className="font-medium text-white">Empty Territory</div>
                      <div className="text-sm text-gray-400">Available for claiming</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-blue-500 border border-gray-500 rounded"></div>
                    <div>
                      <div className="font-medium text-white">Player Territories</div>
                      <div className="text-sm text-gray-400">Color-coded by player</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Instructions */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-green-300">How to Play</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <div className="font-medium text-white">Join the Game</div>
                      <div className="text-gray-400">Enter your name and click "Join Game"</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <div className="font-medium text-white">Wait for Players</div>
                      <div className="text-gray-400">Need at least 2 players to start</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <div className="font-medium text-white">Start Game</div>
                      <div className="text-gray-400">Click "Start Game" when ready</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                    <div>
                      <div className="font-medium text-white">Claim Territories</div>
                      <div className="text-gray-400">Click on empty/neutral territories to claim them</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</div>
                    <div>
                      <div className="font-medium text-white">Expand Strategically</div>
                      <div className="text-gray-400">You can only claim adjacent territories</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
