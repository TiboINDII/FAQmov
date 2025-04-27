// FFmpeg export implementation for INDII Movie Creator

// Export using FFmpeg.wasm for better synchronization
async function exportWithFFmpeg(canvas, ctx) {
    updateStatus('Preparing frames for FFmpeg export...');
    
    const frameRate = 30; // frames per second
    const duration = state.audioDuration;
    const frameCount = Math.ceil(duration * frameRate);
    
    try {
        // Collect frames
        const frames = [];
        
        // Prepare for frame collection
        for (let frameNumber = 0; frameNumber < frameCount; frameNumber++) {
            // Calculate the exact time for this frame
            const exactTime = frameNumber / frameRate;
            
            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Render the frame at the exact time
            renderExactFrame(frameNumber, exactTime, ctx, canvas);
            
            // Convert canvas to blob
            const frameBlob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });
            
            frames.push(frameBlob);
            
            // Update progress (first 50% is frame collection)
            updateExportProgress((frameNumber / frameCount) * 50);
        }
        
        // Extract audio
        const audioBlob = await extractAudioForFFmpeg(state.audioBuffer, state.audioContext);
        
        // Export with FFmpeg
        const success = await exportMovieWithFFmpeg(frames, audioBlob, {
            width: canvas.width,
            height: canvas.height,
            fps: frameRate,
            duration: duration,
            filename: `${state.projectName.replace(/\s+/g, '_')}.mp4`
        });
        
        // Clean up
        document.body.removeChild(canvas);
        
        return success;
    } catch (error) {
        console.error('Error in FFmpeg export process:', error);
        return false;
    }
}

// Render a frame at an exact time (for FFmpeg export)
function renderExactFrame(frameNumber, exactTime, ctx, canvas) {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set a background color
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Find clips visible at this exact time
    const visibleClips = state.clips.filter(clip => {
        return exactTime >= clip.startTime && exactTime < (clip.startTime + clip.duration);
    });
    
    // Sort by track (audio first, then images)
    visibleClips.sort((a, b) => {
        if (a.track === b.track) return 0;
        return a.track === 'audio' ? -1 : 1;
    });
    
    // Draw each visible clip
    visibleClips.forEach(clip => {
        const mediaItem = state.mediaItems.find(item => item.id === clip.mediaId);
        if (!mediaItem || !mediaItem.type.startsWith('image/')) return;
        
        // Get the image element
        const img = document.querySelector(`.media-item[data-id="${mediaItem.id}"] img`);
        if (!img || !img.complete || img.naturalWidth === 0) return;
        
        // Draw the image
        drawImageToCanvas(img, ctx, canvas.width, canvas.height);
    });
    
    // Find highlights visible at this exact time
    const visibleHighlights = state.highlights.filter(highlight => {
        // Show highlights that are at the current time (with a small tolerance)
        const startTime = highlight.time;
        const endTime = highlight.time + highlight.duration;
        return exactTime >= startTime && exactTime <= endTime;
    });
    
    // Draw each visible highlight
    visibleHighlights.forEach(highlight => {
        // Calculate progress for this highlight
        const progress = (exactTime - highlight.time) / highlight.duration;
        
        // Draw the highlight
        if (progress >= 0 && progress <= 1) {
            drawHighlightPulse(ctx, highlight.x / 100 * canvas.width, highlight.y / 100 * canvas.height, progress);
        }
    });
    
    // Draw title if at the start screen (first 2 seconds)
    if (exactTime < 2 && state.videoTitle) {
        // Draw title text
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#016362'; // Dark green color
        ctx.fillText(state.videoTitle, canvas.width / 2, canvas.height / 2);
    }
}
