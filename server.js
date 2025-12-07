const express = require('express');
const cors = require('cors');
const path = require('path');
const YTDlpWrap = require('yt-dlp-wrap').default;
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Resolve platform-specific downloads directory
function getDownloadsDirectory() {
    const platform = os.platform();
    if (platform === 'android' || process.env.ANDROID_ROOT || process.env.ANDROID_DATA) {
        return '/storage/emulated/0/Download';
    }
    return path.join(os.homedir(), 'Downloads');
}

let downloadsDir = getDownloadsDirectory();

// Ensure directory exists and is writable
try {
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
    }
    fs.accessSync(downloadsDir, fs.constants.W_OK);
    console.log(`Download directory set to: ${downloadsDir}`);
} catch (error) {
    console.warn(`Unable to access global Downloads folder (${downloadsDir}): ${error.message}`);
    downloadsDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir);
    }
    console.log(`Falling back to local directory: ${downloadsDir}`);
}

// Determine yt-dlp binary path based on platform
const platform = os.platform();
let ytDlpBinaryPath = path.join(__dirname, 'yt-dlp');
if (platform === 'win32') {
    ytDlpBinaryPath += '.exe';
}

// Initialize yt-dlp and download binary if needed
let ytDlpWrap;
async function initializeYtDlp() {
    try {
        // Check if binary exists
        if (!fs.existsSync(ytDlpBinaryPath)) {
            console.log('yt-dlp binary not found. Downloading...');
            await YTDlpWrap.downloadFromGithub(ytDlpBinaryPath, undefined, platform);
            console.log('yt-dlp binary downloaded successfully.');
        } else {
            console.log('yt-dlp binary found.');
        }
        
        // Initialize with binary path
        ytDlpWrap = new YTDlpWrap(ytDlpBinaryPath);
        console.log('yt-dlp initialized successfully.');
    } catch (error) {
        console.error('Error initializing yt-dlp:', error);
        // Fallback to default (will try to use 'yt-dlp' command)
        ytDlpWrap = new YTDlpWrap();
        console.log('Using default yt-dlp command (may require manual installation).');
    }
}

// Download endpoint
app.post('/download', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'Video URL is required' });
    }

    if (!ytDlpWrap) {
        return res.status(503).json({ error: 'yt-dlp is not initialized yet. Please wait a moment and try again.' });
    }

    try {
        // Download video in highest quality
        // Format: bestvideo+bestaudio/best (best quality video + audio, or best single file)
        const videoPath = path.join(downloadsDir, '%(title)s.%(ext)s');
        
        const ytDlpEventEmitter = ytDlpWrap.exec([
            url,
            '-f', 'bestvideo+bestaudio/best', // Best quality format
            '-o', videoPath,
            '--merge-output-format', 'mp4', // Merge into mp4
            '--ffmpeg-location', ffmpegPath
        ]);

        ytDlpEventEmitter.on('progress', (progress) => {
            console.log('Download progress:', progress.percent + '%', progress.eta);
        });

        ytDlpEventEmitter.on('ytDlpEvent', (eventType, eventData) => {
            console.log('Event:', eventType, eventData);
        });

        ytDlpEventEmitter.on('error', (error) => {
            console.error('Download error:', error);
            res.status(500).json({ error: 'Download failed', details: error.message });
        });

        ytDlpEventEmitter.on('close', (code) => {
            if (code === 0) {
                res.json({ 
                    success: true, 
                    message: 'Video downloaded successfully',
                    path: downloadsDir
                });
            } else {
                res.status(500).json({ 
                    error: 'Download failed', 
                    details: 'Download process exited with code: ' + code,
                    code: code
                });
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Get download status/info
app.get('/info', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'Video URL is required' });
    }

    try {
        const info = await ytDlpWrap.getVideoInfo(url);
        res.json(info);
    } catch (error) {
        console.error('Error getting video info:', error);
        res.status(500).json({ error: 'Failed to get video info', details: error.message });
    }
});

// Start server after initializing yt-dlp
initializeYtDlp().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch((error) => {
    console.error('Failed to initialize server:', error);
    process.exit(1);
});

