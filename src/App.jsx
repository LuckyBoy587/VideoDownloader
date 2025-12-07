import { useState } from 'react'

function App() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('')
  const [statusColor, setStatusColor] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    if (!url.trim()) {
      setStatus('Please enter a video URL')
      setStatusColor('text-red-500')
      return
    }

    setIsLoading(true)
    setStatus('Downloading video in highest quality...')
    setStatusColor('text-blue-500')

    try {
      const response = await fetch('/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        setStatus(`Success! Video downloaded to: ${data.path || 'server downloads folder'}`)
        setStatusColor('text-green-500')
      } else {
        setStatus(`Error: ${data.error || 'Download failed'}`)
        setStatusColor('text-red-500')
      }
    } catch (error) {
      setStatus(`Error: ${error.message}. Make sure the server is running.`)
      setStatusColor('text-red-500')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Video Downloader</h1>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Video URL
            </label>
            <input
              type="text"
              id="videoUrl"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Enter video URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            onClick={handleDownload}
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium transition
              ${isLoading 
                ? 'bg-blue-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
          >
            {isLoading ? 'Downloading...' : 'Download'}
          </button>

          {status && (
            <div className={`mt-4 p-3 rounded-md bg-gray-50 text-sm ${statusColor}`}>
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
