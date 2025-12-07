const express = require('express');
const cors = require('cors');
const path = require('path');
const ytdlp = require('yt-dlp-exec');

const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

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





// Download endpoint
app.post('/download', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'Video URL is required' });
    }

    try {
        const videoPath = path.join(downloadsDir, '%(title)s.%(ext)s');
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        const subprocess = ytdlp.exec(url, {
            output: videoPath,
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            mergeOutputFormat: 'mp4',
            ffmpegLocation: require('ffmpeg-static')
        });

        subprocess.stdout.on('data', (data) => {
            const str = data.toString();
            // console.log('stdout:', str); // Debugging

            // Extract progress percentage
            // [download]  15.0% of ...
            const match = str.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
            if (match) {
                const percent = parseFloat(match[1]);
                // Basic ETA extraction could be added if regex is more complex
                res.write(JSON.stringify({ type: 'progress', percent, eta: '?' }) + '\n');
            }
        });

        subprocess.stderr.on('data', (data) => {
            // yt-dlp sometimes outputs errors or info to stderr
            console.log('stderr:', data.toString());
        });

        subprocess.on('error', (error) => {
            console.error('Download error:', error);
            res.write(JSON.stringify({ type: 'error', message: error.message }) + '\n');
            res.end();
        });

        subprocess.on('close', (code) => {
            if (code === 0) {
                res.write(JSON.stringify({ 
                    type: 'success', 
                    message: 'Video downloaded successfully',
                    path: downloadsDir
                }) + '\n');
            } else {
                res.write(JSON.stringify({ 
                    type: 'error', 
                    message: 'Download process exited with code: ' + code
                }) + '\n');
            }
            res.end();
        });

    } catch (error) {
        console.error('Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Server error', details: error.message });
        } else {
            res.write(JSON.stringify({ type: 'error', message: error.message }) + '\n');
            res.end();
        }
    }
});

// Get download status/info
app.get('/info', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'Video URL is required' });
    }

    try {
        const info = await ytdlp(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true
        });
        res.json(info);
    } catch (error) {
        console.error('Error getting video info:', error);
        res.status(500).json({ error: 'Failed to get video info', details: error.message });
    }
});

// Start server after initializing yt-dlp
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

