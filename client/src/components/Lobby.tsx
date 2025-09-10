import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function Lobby() {
  const { mode } = useParams<{ mode: string }>()
  const navigate = useNavigate()
  const [playerName, setPlayerName] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [gameModeData, setGameModeData] = useState<{mode: string, maxPlayers: number, currentPlayers: number} | null>(null)
  const [lobbyPlayers, setLobbyPlayers] = useState<Array<{id: string, name: string, color: string}>>([])
  const [forceStartVotes, setForceStartVotes] = useState<Set<string>>(new Set())
  const [playerId, setPlayerId] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  const handleJoinGame = () => {
    if (!playerName.trim() || !mode) return
    
    // Close existing connection if any
    if (wsRef.current) {
      console.log('Closing existing WebSocket connection')
      wsRef.current.close()
      wsRef.current = null
    }
    
    console.log('Creating WebSocket connection...')
    setIsConnecting(true)
    wsRef.current = new WebSocket('ws://localhost:3001')
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected successfully!')
      setIsConnected(true)
      setIsConnecting(false)
      wsRef.current?.send(JSON.stringify({
        type: 'joinLobby',
        data: { 
          name: playerName.trim(),
          gameMode: mode
        }
      }))
    }
    
    wsRef.current.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      setIsConnected(false)
      setIsConnecting(false)
      wsRef.current = null
      setGameModeData(null)
      setLobbyPlayers([])
      setForceStartVotes(new Set())
    }
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
      setIsConnecting(false)
      wsRef.current = null
      setGameModeData(null)
      setLobbyPlayers([])
      setForceStartVotes(new Set())
    }

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('Received message:', message.type, message.data)
      
      switch (message.type) {
        case 'lobbyJoined':
          setPlayerId(message.data.playerId)
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
          // Navigate to game when it starts
          const gameId = Date.now().toString() // Simple game ID generation
          navigate(`/game/${gameId}`)
          break
        case 'nameTaken':
          alert('Name already taken! Please choose a different name.')
          break
      }
    }
  }

  const handleBack = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    navigate('/')
  }

  const handleForceStart = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'forceStart',
        data: { playerId }
      }))
    }
  }

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-gray-800 p-8 rounded-lg border border-gray-700 max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2 text-blue-400">Connecting...</h2>
          <p className="text-gray-400">Joining {mode?.toUpperCase()} lobby</p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-gray-800 p-8 rounded-lg border border-gray-700 max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-blue-400">
            {mode?.toUpperCase()} Lobby
          </h2>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-lg mb-4"
            />
            <button
              onClick={handleJoinGame}
              disabled={!playerName.trim()}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
            >
              Join Lobby
            </button>
          </div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center bg-gray-800 p-8 rounded-lg border border-gray-700 max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">
          {gameModeData?.mode.toUpperCase()} Lobby
        </h2>
        <div className="mb-6">
          <div className="text-lg mb-2">
            {gameModeData?.currentPlayers} out of {gameModeData?.maxPlayers} players
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((gameModeData?.currentPlayers || 0) / (gameModeData?.maxPlayers || 1)) * 100}%` }}
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
            onClick={handleForceStart}
            className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded transition-colors"
          >
            {forceStartVotes.has(playerId) ? 'Cancel Force Start' : 'Force Start'}
          </button>
          <button
            onClick={handleBack}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
          >
            Leave Lobby
          </button>
        </div>
      </div>
    </div>
  )
}

