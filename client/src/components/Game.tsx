import { useParams, useNavigate } from 'react-router-dom'

export default function Game() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center bg-gray-800 p-8 rounded-lg border border-gray-700 max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">Game #{gameId}</h2>
        <p className="text-gray-400 mb-6">Game is starting...</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
        >
          Back to Menu
        </button>
      </div>
    </div>
  )
}

