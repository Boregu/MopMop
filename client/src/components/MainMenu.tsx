import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MainMenu() {
  const [playerName, setPlayerName] = useState('')
  const [currentPage, setCurrentPage] = useState<'main' | 'settings' | 'profile'>('main')
  const navigate = useNavigate()

  const handlePlayClick = () => {
    if (playerName.trim()) {
      navigate('/lobby/ffa')
    }
  }

  const handleGameModeClick = (mode: string) => {
    if (playerName.trim()) {
      navigate(`/lobby/${mode}`)
    }
  }

  return (
    <div className="flex items-center justify-center h-full relative">
      {/* Settings and Profile Buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => {
            console.log('Settings button clicked')
            setCurrentPage('settings')
          }}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-300 transform hover:scale-105"
        >
          ⚙️ Settings
        </button>
        <button
          onClick={() => {
            console.log('Profile button clicked')
            setCurrentPage('profile')
          }}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-300 transform hover:scale-105"
        >
          👤 Profile
        </button>
      </div>
      
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8 text-blue-400">MopMop</h1>
        <p className="text-gray-400 mb-8">A real-time strategy game inspired by generals.io</p>
        
        {currentPage === 'main' ? (
          // Main Menu
          <div className="space-y-4">
            <div className="flex gap-4 mb-6 justify-center">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-lg w-full max-w-md"
              />
            </div>
            <button
              onClick={handlePlayClick}
              disabled={!playerName.trim()}
              className="w-48 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors text-lg font-semibold"
            >
              Play
            </button>
          </div>
        ) : currentPage === 'settings' ? (
          // Settings Page
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
        ) : currentPage === 'profile' ? (
          // Profile Page
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
                  <div><span className="font-medium">Total Games:</span> 0</div>
                  <div><span className="font-medium">Total Wins:</span> 0</div>
                  <div><span className="font-medium">Total Losses:</span> 0</div>
                  <div><span className="font-medium">Win Rate:</span> 0%</div>
                </div>
              </div>
              
              {/* Game Mode Stats */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Game Mode Statistics</h3>
                <div className="space-y-3">
                  <div className="border-b border-gray-600 pb-2">
                    <div className="font-medium">FFA</div>
                    <div className="text-sm text-gray-300">Games: 0 | Wins: 0 | Losses: 0</div>
                    <div className="text-sm text-gray-300">Win Rate: 0%</div>
                  </div>
                  <div className="border-b border-gray-600 pb-2">
                    <div className="font-medium">1v1</div>
                    <div className="text-sm text-gray-300">Games: 0 | Wins: 0 | Losses: 0</div>
                    <div className="text-sm text-gray-300">Win Rate: 0%</div>
                  </div>
                  <div className="border-b border-gray-600 pb-2">
                    <div className="font-medium">2v2</div>
                    <div className="text-sm text-gray-300">Games: 0 | Wins: 0 | Losses: 0</div>
                    <div className="text-sm text-gray-300">Win Rate: 0%</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Match History */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Match History</h3>
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="p-4 text-center text-gray-400">No matches played yet</div>
              </div>
            </div>
          </div>
        ) : (
          // Game Mode Selection
          <div className="space-y-4">
            <div className="flex gap-4 mb-6 justify-center">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-lg w-full max-w-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <button
                onClick={() => handleGameModeClick('ffa')}
                disabled={!playerName.trim()}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors text-lg font-semibold transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                FFA
                <div className="text-sm text-gray-300">Up to 8 players</div>
              </button>
              <button
                onClick={() => handleGameModeClick('1v1')}
                disabled={!playerName.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors text-lg font-semibold transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                1v1
                <div className="text-sm text-gray-300">2 players</div>
              </button>
              <button
                onClick={() => handleGameModeClick('2v2')}
                disabled={!playerName.trim()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors text-lg font-semibold transform hover:scale-105 active:scale-95 disabled:transform-none"
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
              onClick={() => setCurrentPage('main')}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

