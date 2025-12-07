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
// app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Resolve platform-specific downloads directory
const downloadsDir = path.join(__dirname, 'temp_downloads');

// Ensure directory exists
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}
console.log(`Temporary download directory set to: ${downloadsDir}`);

app.get("/", (req, res) => {
    // Get all the mp4 files in the downloads directory
    fs.readdir(downloadsDir, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading downloads directory');
        }
        const mp4Files = files.filter(file => file.endsWith('.mp4'));
        res.json(mp4Files);
    });
});

// Serve downloaded file and delete after sending
app.get('/file/:fileId', (req, res) => {
    const { fileId } = req.params;
    const { filename } = req.query;
    const filePath = path.join(downloadsDir, `${fileId}.mp4`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found or expired');
    }

    res.download(filePath, filename || 'video.mp4', (err) => {
        if (err) {
            console.error('Error sending file:', err);
        }
        // Delete file after download (or attempted download)
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
            else console.log(`Cleaned up temp file: ${fileId}`);
        });
    });
});

// Download endpoint
app.post('/download', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'Video URL is required' });
    }

    const fileId = Date.now().toString();
    const tempFilePath = path.join(downloadsDir, `${fileId}.mp4`);

    try {
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        // 1. Get video info first to get the title
        res.write(JSON.stringify({ type: 'progress', percent: 0, eta: 'Fetching info...' }) + '\n');
        
        let videoTitle = 'video';
        try {
            const info = await ytdlp(url, {
                dumpSingleJson: true,
                noWarnings: true,
                noCallHome: true,
                preferFreeFormats: true,
            });
            videoTitle = info.title.replace(/[^\w\s.-]/g, '_'); // Sanitize filename
        } catch (e) {
            console.warn('Failed to fetch metadata, using default name:', e.message);
        }

        // 2. Start Download
        const subprocess = ytdlp.exec(url, {
            output: tempFilePath,
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            mergeOutputFormat: 'mp4',
            ffmpegLocation: require('ffmpeg-static')
        });

        subprocess.stdout.on('data', (data) => {
            const str = data.toString();
            const match = str.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
            if (match) {
                const percent = parseFloat(match[1]);
                res.write(JSON.stringify({ type: 'progress', percent, eta: 'Downloading...' }) + '\n');
            }
        });

        subprocess.stderr.on('data', (data) => {
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
                    message: 'Download ready',
                    downloadUrl: `/file/${fileId}?filename=${encodeURIComponent(videoTitle)}.mp4`
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

