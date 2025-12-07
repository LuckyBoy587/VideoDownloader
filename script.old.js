const playButton = document.getElementById('playButton');
const videoUrlInput = document.getElementById('videoUrl');
const statusDiv = document.createElement('div');
statusDiv.id = 'status';
document.body.appendChild(statusDiv);

playButton.addEventListener('click', async () => {
    const url = videoUrlInput.value.trim();
    
    if (!url) {
        statusDiv.textContent = 'Please enter a video URL';
        statusDiv.style.color = 'red';
        return;
    }
    
    playButton.disabled = true;
    statusDiv.textContent = 'Downloading video in highest quality...';
    statusDiv.style.color = 'blue';
    
    try {
        const response = await fetch('http://localhost:3000/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            statusDiv.textContent = `Success! Video downloaded to: ${data.path}`;
            statusDiv.style.color = 'green';
        } else {
            statusDiv.textContent = `Error: ${data.error || 'Download failed'}`;
            statusDiv.style.color = 'red';
        }
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}. Make sure the server is running.`;
        statusDiv.style.color = 'red';
    } finally {
        playButton.disabled = false;
    }
});