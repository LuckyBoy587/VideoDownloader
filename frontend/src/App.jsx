import { useState } from 'react'

function App() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('')
  const [statusColor, setStatusColor] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleDownload = async () => {
    if (!url.trim()) {
      setStatus('Please enter a video URL')
      setStatusColor('text-red-500')
      return
    }

    setIsLoading(true)
    setStatus('Starting download...')
    setStatusColor('text-blue-500')
    setProgress(0)

    try {
      const response = await fetch('https://videodownloader-lgeo.onrender.com/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim() !== '')
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            
            if (data.type === 'progress') {
              const percent = parseFloat(data.percent)
              setProgress(percent)
              const eta = data.eta ? data.eta : 'Calculating...'
              setStatus(`Downloading: ${data.percent}% (ETA: ${eta})`)
            } else if (data.type === 'success') {
              setStatus('Download ready! Starting file transfer...')
              setStatusColor('text-green-500')
              setProgress(100)

              if (data.downloadUrl) {
                const BASE_URL = 'https://videodownloader-lgeo.onrender.com'
                const link = document.createElement('a')
                link.href = BASE_URL + data.downloadUrl
                link.setAttribute('download', '')
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }
            } else if (data.type === 'error') {
              setStatus(`Error: ${data.message}`)
              setStatusColor('text-red-500')
            }
          } catch (e) {
            console.error('Error parsing JSON chunk', e)
          }
        }
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

          {isLoading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

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
