// Web Worker for handling movie export rendering
// This allows the export process to run in the background without blocking the UI

// Listen for messages from the main thread
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'init':
            // Initialize the worker with export settings
            const { frameCount, frameRate, canvasWidth, canvasHeight } = data;
            self.frameCount = frameCount;
            self.frameRate = frameRate;
            self.canvasWidth = canvasWidth;
            self.canvasHeight = canvasHeight;
            self.frameDuration = 1000 / frameRate;
            
            // Create an OffscreenCanvas for rendering
            self.canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
            self.ctx = self.canvas.getContext('2d');
            
            // Acknowledge initialization
            self.postMessage({ type: 'initialized' });
            break;
            
        case 'renderFrame':
            // Render a specific frame
            const { frameNumber, startScreenData, clipsByTime, highlightsByTime, mediaItems, videoTitle } = data;
            
            // Render the frame
            const frameData = renderFrame(
                frameNumber, 
                startScreenData, 
                clipsByTime, 
                highlightsByTime, 
                mediaItems,
                videoTitle
            );
            
            // Send the rendered frame back to the main thread
            self.postMessage({ 
                type: 'frameRendered', 
                frameNumber: frameNumber,
                imageData: frameData,
                progress: (frameNumber / self.frameCount) * 100
            });
            
            break;
            
        case 'terminate':
            // Clean up and terminate
            self.close();
            break;
    }
};

// Render a specific frame
function renderFrame(frameNumber, startScreenData, clipsByTime, highlightsByTime, mediaItems, videoTitle) {
    // Calculate time for this frame
    const currentTime = frameNumber / self.frameRate;
    
    // Log every second for debugging
    if (frameNumber % self.frameRate === 0) {
        console.log(`Worker: Rendering frame ${frameNumber} at time ${currentTime.toFixed(2)}s`);
    }
    
    // Clear canvas with white background
    self.ctx.fillStyle = 'white';
    self.ctx.fillRect(0, 0, self.canvasWidth, self.canvasHeight);
    
    // Show start screen for the first 60 frames (2 seconds at 30fps)
    if (frameNumber < 60) {
        // Use the start screen data passed from the main thread
        if (startScreenData && startScreenData.imageData) {
            // Draw the start screen image
            const imageData = new ImageData(
                new Uint8ClampedArray(startScreenData.imageData), 
                self.canvasWidth, 
                self.canvasHeight
            );
            self.ctx.putImageData(imageData, 0, 0);
            
            // Add title text if provided
            if (videoTitle) {
                // Draw title text
                self.ctx.fillStyle = '#016362'; // Dark green color
                self.ctx.font = 'bold 120px Arial';
                self.ctx.textAlign = 'center';
                self.ctx.textBaseline = 'middle';
                self.ctx.fillText(videoTitle, self.canvasWidth / 2, self.canvasHeight / 2);
            }
        } else {
            // Fallback to a colored background if no start screen image
            self.ctx.fillStyle = '#016362'; // Dark green background
            self.ctx.fillRect(0, 0, self.canvasWidth, self.canvasHeight);
            
            // Add title text if provided
            if (videoTitle) {
                self.ctx.fillStyle = 'white';
                self.ctx.font = 'bold 120px Arial';
                self.ctx.textAlign = 'center';
                self.ctx.textBaseline = 'middle';
                self.ctx.fillText(videoTitle, self.canvasWidth / 2, self.canvasHeight / 2);
            }
        }
    } else {
        // Get clips visible at this frame
        const visibleClips = clipsByTime[frameNumber] || [];
        
        // Draw each visible clip
        visibleClips.forEach(clip => {
            const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
            if (!mediaItem || !mediaItem.imageData) return;
            
            // Create ImageData from the ArrayBuffer
            const imageData = new ImageData(
                new Uint8ClampedArray(mediaItem.imageData), 
                mediaItem.width, 
                mediaItem.height
            );
            
            // Draw the image centered and scaled to fit
            drawImageToCanvas(imageData, mediaItem.width, mediaItem.height);
        });
        
        // Draw highlights for this frame
        const activeHighlights = highlightsByTime[frameNumber] || [];
        if (activeHighlights.length > 0) {
            // Save context state
            self.ctx.save();
            
            // Draw each highlight
            activeHighlights.forEach(highlight => {
                // Calculate animation progress (0 to 1) using the exact frame
                const exactStartFrame = highlight.exactFrame;
                const highlightProgress = (frameNumber - exactStartFrame) / (highlight.duration * self.frameRate);
                
                // Ensure progress is between 0 and 1
                const clampedProgress = Math.max(0, Math.min(1, highlightProgress));
                
                // Draw the highlight pulse
                drawHighlightPulse(
                    highlight.x / 100 * self.canvasWidth, 
                    highlight.y / 100 * self.canvasHeight, 
                    clampedProgress
                );
            });
            
            // Restore context state
            self.ctx.restore();
        }
    }
    
    // Return the rendered frame as ImageData
    return self.ctx.getImageData(0, 0, self.canvasWidth, self.canvasHeight);
}

// Draw an image to the canvas with proper scaling
function drawImageToCanvas(imageData, imgWidth, imgHeight) {
    // Create a temporary canvas to draw the image
    const tempCanvas = new OffscreenCanvas(imgWidth, imgHeight);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    
    // Calculate aspect ratios
    const canvasAspect = self.canvasWidth / self.canvasHeight;
    const imgAspect = imgWidth / imgHeight;
    
    let drawWidth, drawHeight, x, y;
    
    // Determine how to scale the image to fit while maintaining aspect ratio
    if (imgAspect > canvasAspect) {
        // Image is wider than canvas (relative to height)
        drawWidth = self.canvasWidth;
        drawHeight = drawWidth / imgAspect;
        x = 0;
        y = (self.canvasHeight - drawHeight) / 2;
    } else {
        // Image is taller than canvas (relative to width)
        drawHeight = self.canvasHeight;
        drawWidth = drawHeight * imgAspect;
        x = (self.canvasWidth - drawWidth) / 2;
        y = 0;
    }
    
    // Draw the image centered and scaled
    self.ctx.drawImage(tempCanvas, x, y, drawWidth, drawHeight);
}

// Draw a highlight pulse animation
function drawHighlightPulse(x, y, progress) {
    // Use a more precise animation curve that matches the CSS animation
    // This ensures the exported video animation matches what users see in the preview
    
    // Calculate size based on progress (0 to 1)
    // Start at 0.5x size, grow to 3.5x size (matching CSS animation)
    const maxRadius = 250; // Maximum radius in pixels
    
    // Use a cubic ease-out function for smoother animation
    // This better matches the CSS ease-out timing
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    
    // Scale from 0.5 to 3.5 (matching the CSS keyframes)
    const scale = 0.5 + (easedProgress * 3.0);
    const radius = maxRadius * scale / 3.5; // Normalize to match CSS scale
    
    // Calculate opacity based on progress (start at 0.9, fade to 0)
    // Use a linear fade for opacity
    const opacity = Math.max(0, 0.9 - progress * 0.9);
    
    // Draw outer glow
    const gradient = self.ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius);
    gradient.addColorStop(0, `rgba(1, 99, 98, ${opacity * 0.8})`); // Dark green color
    gradient.addColorStop(1, `rgba(1, 99, 98, 0)`);
    
    self.ctx.fillStyle = gradient;
    self.ctx.beginPath();
    self.ctx.arc(x, y, radius, 0, Math.PI * 2);
    self.ctx.fill();
    
    // Draw inner circle with white border
    self.ctx.fillStyle = `rgba(1, 99, 98, ${opacity * 0.9})`; // Dark green color
    self.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.9})`;
    self.ctx.lineWidth = 3;
    
    self.ctx.beginPath();
    self.ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    self.ctx.fill();
    self.ctx.stroke();
    
    // Add "TAP" text
    self.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    self.ctx.font = 'bold 24px Arial';
    self.ctx.textAlign = 'center';
    self.ctx.textBaseline = 'middle';
    self.ctx.fillText('TAP', x, y);
}
