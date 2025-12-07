# Video Downloader

A web application to download videos using yt-dlp in the highest quality possible.

## Setup

1. Install Node.js dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open `index.html` in your browser or navigate to `http://localhost:3000`

## Usage

1. Enter a video URL in the input field
2. Click "Download" button
3. The video will be downloaded in the highest quality available to the `downloads` folder

## Requirements

- Node.js (v14 or higher)
- yt-dlp will be automatically downloaded by the yt-dlp-wrap package

## Notes

- Videos are downloaded to the `downloads` folder in the project directory
- The application downloads videos in the best available quality (bestvideo+bestaudio merged into mp4)
- Make sure the server is running before using the download feature

