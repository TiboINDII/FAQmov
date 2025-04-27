// DOM Elements
const importImagesBtn = document.getElementById('importImages');
const importAudioBtn = document.getElementById('importAudio');
const imageInput = document.getElementById('imageInput');
const audioInput = document.getElementById('audioInput');
const mediaLibrary = document.getElementById('mediaLibrary');
const audioTrack = document.getElementById('audioTrack');
const imageTrack = document.getElementById('imageTrack');
const highlightTrack = document.getElementById('highlightTrack');

// Project loading elements
const loadProjectBtn = document.getElementById('loadProject');
const projectInput = document.getElementById('projectInput');
const previewFrame = document.getElementById('previewFrame');
const previewContainer = document.querySelector('.preview-container');
const playPauseBtn = document.getElementById('playPause');
const stopBtn = document.getElementById('stop');
const rewindStartBtn = document.getElementById('rewindStart');
const rewindStepBtn = document.getElementById('rewindStep');
const forwardStepBtn = document.getElementById('forwardStep');
const timeMarker = document.getElementById('timeMarker');
const timeRuler = document.getElementById('timeRuler');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const fitToAudioBtn = document.getElementById('fitToAudio');
const saveProjectBtn = document.getElementById('saveProject');
const exportMovieBtn = document.getElementById('exportMovie');
const newProjectBtn = document.getElementById('newProject');
const videoTitleInput = document.getElementById('videoTitle');
const statusBar = document.querySelector('.app-status');
const timeDisplay = document.querySelector('.time-display');

// Application State
const state = {
    mediaItems: [],
    audioFile: null,
    audioDuration: 0,
    audioContext: null,
    audioBuffer: null,
    audioSource: null,
    audioAnalyser: null,
    audioData: null, // Store audio data for redrawing waveform when zooming
    isPlaying: false,
    currentTime: 0,
    timelineScale: 100, // pixels per second
    timelineWidth: 0,
    clips: [],
    highlights: [], // Array to store highlight markers
    selectedClip: null,
    selectedHighlight: null, // Currently selected highlight
    isDragging: false,
    isResizing: false,
    isDraggingHighlight: false, // Flag for dragging highlights
    resizeDirection: null,
    dragStartX: 0,
    dragStartY: 0,
    originalLeft: 0,
    originalWidth: 0,
    projectName: 'New Project',
    previewScale: 0.2,
    videoTitle: '',
    startScreenImage: 'startscreen.webp',
    exportMimeType: '', // Will store the selected MIME type for export
    exportFormat: 'avi', // Default export format
    highlightColor: '#016362', // Dark green color for highlight pulse animations
    mouseX: 50, // Current mouse X position in preview (percentage)
    mouseY: 50  // Current mouse Y position in preview (percentage)
};

// Initialize the application
function init() {
    // Set up event listeners
    importImagesBtn.addEventListener('click', () => imageInput.click());
    importAudioBtn.addEventListener('click', () => audioInput.click());
    loadProjectBtn.addEventListener('click', () => projectInput.click());
    imageInput.addEventListener('change', handleImageImport);
    audioInput.addEventListener('change', handleAudioImport);
    projectInput.addEventListener('change', handleProjectImport);

    // Playback controls
    playPauseBtn.addEventListener('click', togglePlayback);
    stopBtn.addEventListener('click', stopPlayback);
    rewindStartBtn.addEventListener('click', rewindToStart);
    rewindStepBtn.addEventListener('click', () => seekRelative(-5)); // Rewind 5 seconds
    forwardStepBtn.addEventListener('click', () => seekRelative(5)); // Forward 5 seconds

    // Touch action functionality has been removed

    // Other controls
    zoomInBtn.addEventListener('click', () => changeTimelineZoom(1.2));
    zoomOutBtn.addEventListener('click', () => changeTimelineZoom(0.8));
    fitToAudioBtn.addEventListener('click', setZoomToFitAudio);
    saveProjectBtn.addEventListener('click', saveProject);
    exportMovieBtn.addEventListener('click', exportMovie);
    newProjectBtn.addEventListener('click', confirmNewProject);

    // Set up video title input
    if (videoTitleInput) {
        videoTitleInput.addEventListener('input', updateVideoTitle);
    }

    // Set up grid toggle
    const toggleGridCheckbox = document.getElementById('toggleGrid');
    if (toggleGridCheckbox) {
        toggleGridCheckbox.addEventListener('change', toggleGrid);
    }

    // Set up timeline interaction
    setupTimelineInteraction();

    // Initialize audio context
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        state.audioContext = new AudioContext();
    } catch (e) {
        alert('Web Audio API is not supported in this browser');
        console.error(e);
    }

    // Preload the start screen image
    preloadStartScreenImage();

    // Update timeline width
    updateTimelineWidth();

    // Calculate optimal preview scale
    updatePreviewScale();

    // Show start screen in preview
    updatePreview();

    // Add resize event listeners
    window.addEventListener('resize', () => {
        updateTimelineWidth();
        updatePreviewScale();
        updatePreview();
    });

    // Set up animation loop
    requestAnimationFrame(updateTimeMarker);

    // Update status
    updateStatus('Ready');

    // Load the default project from URL
    const defaultProjectURL = 'https://tiboindii.github.io/FAQmov/project01.indii';
    console.log('Loading default project from:', defaultProjectURL);
    loadProjectFromURL(defaultProjectURL);
}

// Preload the start screen image
function preloadStartScreenImage() {
    console.log("Preloading start screen image:", state.startScreenImage);

    // Try both webp and jpg versions
    const imgPaths = ['startscreen.webp', 'startscreen.jpg'];
    let currentPathIndex = 0;

    function tryLoadImage(path) {
        console.log(`Attempting to preload start screen image from: ${path}`);

        const img = new Image();

        img.onload = () => {
            console.log(`Start screen image preloaded successfully from ${path}: ${img.width}x${img.height}`);
            // Update the state to use this path for future references
            state.startScreenImage = path;
        };

        img.onerror = (e) => {
            console.error(`Error preloading start screen image from ${path}:`, e);

            // Try with absolute path
            const absolutePath = new URL(path, window.location.href).href;
            console.log(`Trying with absolute path: ${absolutePath}`);

            const fallbackImg = new Image();

            fallbackImg.onload = () => {
                console.log(`Start screen image preloaded with absolute path ${absolutePath}: ${fallbackImg.width}x${fallbackImg.height}`);
                // Update the state to use this path for future references
                state.startScreenImage = absolutePath;
            };

            fallbackImg.onerror = (e2) => {
                console.error(`Failed to preload start screen image with absolute path ${absolutePath}:`, e2);

                // Try next format if available
                currentPathIndex++;
                if (currentPathIndex < imgPaths.length) {
                    tryLoadImage(imgPaths[currentPathIndex]);
                } else {
                    // All formats failed
                    console.warn("All start screen image formats failed to preload.");
                }
            };

            fallbackImg.src = absolutePath;
        };

        // Set the source to trigger loading
        img.src = path;
    }

    // Start trying to load the first image format
    tryLoadImage(state.startScreenImage);
}

// Toggle grid visibility
function toggleGrid(event) {
    const previewFrame = document.getElementById('previewFrame');
    if (previewFrame) {
        if (event.target.checked) {
            previewFrame.style.backgroundImage = `
                linear-gradient(rgba(200, 200, 200, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(200, 200, 200, 0.1) 1px, transparent 1px)
            `;
        } else {
            previewFrame.style.backgroundImage = 'none';
        }
    }
}

// Update video title
function updateVideoTitle(event) {
    state.videoTitle = event.target.value;
    updatePreview();
    updateStatus('Video title updated');
}

// Calculate and update the optimal scale for the preview frame
function updatePreviewScale() {
    const previewContainer = document.querySelector('.preview-container');
    const previewFrame = document.getElementById('previewFrame');

    if (!previewContainer || !previewFrame) return;

    // Get container dimensions
    const containerHeight = previewContainer.clientHeight;
    const containerWidth = previewContainer.clientWidth;

    // Calculate the aspect ratios
    const containerAspect = containerWidth / containerHeight;
    const frameAspect = 1284 / 2778;

    let scale, translateX, translateY;

    // Determine if we're constrained by width or height
    if (frameAspect < containerAspect) {
        // Height constrained - use full height
        scale = containerHeight / 2778;
        translateX = (containerWidth - (1284 * scale)) / 2;
        translateY = 0;
    } else {
        // Width constrained - use full width
        scale = containerWidth / 1284;
        translateX = 0;
        translateY = (containerHeight - (2778 * scale)) / 2;
    }

    // Apply the transformation
    previewFrame.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

    // Update state
    state.previewScale = scale;

    // Log the scale for debugging
    console.log(`Preview scale: ${scale.toFixed(3)}, Container: ${containerWidth}x${containerHeight}`);
}

// Handle image import
function handleImageImport(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Create an array to hold new media items
    const newMediaItems = [];

    // Process each file
    const filePromises = Array.from(files).map(file => {
        return new Promise((resolve) => {
            // Check if file is an image or PDF
            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                const reader = new FileReader();

                reader.onload = function(e) {
                    const mediaItem = {
                        id: generateId(),
                        name: file.name,
                        type: file.type,
                        src: e.target.result,
                        file: file
                    };

                    newMediaItems.push(mediaItem);
                    resolve();
                };

                reader.readAsDataURL(file);
            } else {
                resolve();
            }
        });
    });

    // After all files are processed, sort and add to library
    Promise.all(filePromises).then(() => {
        // Sort all media items alphabetically by name
        const allMediaItems = [...state.mediaItems, ...newMediaItems];
        allMediaItems.sort((a, b) => a.name.localeCompare(b.name));

        // Update state with sorted media items
        state.mediaItems = allMediaItems;

        // Clear and rebuild the media library
        rebuildMediaLibrary();

        updateStatus(`${newMediaItems.length} images imported and sorted alphabetically`);
    });

    // Reset input
    event.target.value = '';
}

// Rebuild the entire media library with sorted items
function rebuildMediaLibrary() {
    // Clear the media library
    mediaLibrary.innerHTML = '';

    // Add all media items in sorted order
    state.mediaItems.forEach(mediaItem => {
        addMediaItemToLibrary(mediaItem);
    });
}

// Handle audio import
function handleAudioImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is an audio
    if (file.type.startsWith('audio/')) {
        const reader = new FileReader();

        reader.onload = function(e) {
            state.audioFile = {
                id: generateId(),
                name: file.name,
                type: file.type,
                src: e.target.result,
                file: file
            };

            // Process audio file
            processAudioFile(e.target.result);

            // Enable all playback controls
            playPauseBtn.disabled = false;
            stopBtn.disabled = false;
            rewindStartBtn.disabled = false;
            rewindStepBtn.disabled = false;
            forwardStepBtn.disabled = false;
        };

        reader.readAsDataURL(file);
    }

    // Reset input
    event.target.value = '';
    updateStatus('Audio imported');
}

// Process audio file to get duration and waveform
function processAudioFile(audioSrc) {
    // Clear previous audio track
    audioTrack.innerHTML = '';

    // Create waveform container
    const waveformContainer = document.createElement('div');
    waveformContainer.className = 'waveform-container';
    audioTrack.appendChild(waveformContainer);

    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Processing audio...';
    waveformContainer.appendChild(loadingIndicator);

    // Make sure the audio context is running
    if (state.audioContext.state === 'suspended') {
        state.audioContext.resume();
    }

    // For data URLs, we need to extract the base64 part
    let audioData;
    if (audioSrc.startsWith('data:')) {
        // Extract the base64 part of the data URL
        const base64String = audioSrc.split(',')[1];
        // Convert base64 to array buffer
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        audioData = bytes.buffer;
    } else {
        // For regular URLs, use fetch
        fetch(audioSrc)
            .then(response => response.arrayBuffer())
            .then(buffer => processAudioBuffer(buffer))
            .catch(error => {
                console.error('Error fetching audio data:', error);
                updateStatus('Error loading audio file');
                waveformContainer.innerHTML = '<div class="error-message">Error loading audio</div>';
            });
        return;
    }

    // Process the audio buffer
    processAudioBuffer(audioData);

    function processAudioBuffer(arrayBuffer) {
        state.audioContext.decodeAudioData(arrayBuffer)
            .then(originalAudioBuffer => {
                // Remove loading indicator
                if (loadingIndicator.parentNode) {
                    loadingIndicator.parentNode.removeChild(loadingIndicator);
                }

                // Add 3 seconds of silence at the beginning (with first 2 seconds for the start screen)
                const silenceDuration = 3; // 3 seconds of silence
                const originalDuration = originalAudioBuffer.duration;
                const newDuration = originalDuration + silenceDuration;

                // Create a new buffer with the extended duration
                const newAudioBuffer = state.audioContext.createBuffer(
                    originalAudioBuffer.numberOfChannels,
                    state.audioContext.sampleRate * newDuration,
                    state.audioContext.sampleRate
                );

                // Copy the original audio data, offset by 3 seconds
                for (let channel = 0; channel < originalAudioBuffer.numberOfChannels; channel++) {
                    const originalData = originalAudioBuffer.getChannelData(channel);
                    const newData = newAudioBuffer.getChannelData(channel);

                    // The first 3 seconds will remain silent (filled with zeros)
                    // Copy the original data starting at the 3-second mark
                    const silenceSamples = state.audioContext.sampleRate * silenceDuration;
                    for (let i = 0; i < originalData.length; i++) {
                        newData[i + silenceSamples] = originalData[i];
                    }
                }

                // Store the new buffer and duration
                state.audioBuffer = newAudioBuffer;
                state.audioDuration = newDuration;

                // Extract audio data for waveform visualization
                state.audioData = newAudioBuffer.getChannelData(0);

                // Set zoom level to fit the entire audio clip first
                // This will determine the optimal scale for the waveform
                setZoomToFitAudio();

                // Create waveform visualization with the current scale
                createWaveform(newAudioBuffer, waveformContainer);

                // Update timeline width based on audio duration
                updateTimelineWidth();

                // Update time display
                updateTimeDisplay();

                // Add start screen clip automatically
                addStartScreenClip();

                // Log the adjustment
                console.log(`Audio loaded with 3s silence prefix: ${state.audioDuration.toFixed(2)}s, Scale: ${state.timelineScale.toFixed(2)}px/sec`);

                // Enable all playback controls
                playPauseBtn.disabled = false;
                stopBtn.disabled = false;
                rewindStartBtn.disabled = false;
                rewindStepBtn.disabled = false;
                forwardStepBtn.disabled = false;

                console.log('Playback controls enabled after audio processing');
                updateStatus('Audio imported with 3s silence prefix (2s start screen)');
            })
            .catch(error => {
                console.error('Error decoding audio data:', error);
                updateStatus('Error processing audio');
                waveformContainer.innerHTML = '<div class="error-message">Error decoding audio</div>';
            });
    }
}

// Create audio waveform visualization
function createWaveform(audioBuffer, container) {
    // Clear any existing waveform
    container.innerHTML = '';

    // Create canvas for waveform
    const canvas = document.createElement('canvas');
    canvas.className = 'waveform';
    canvas.id = 'waveformCanvas';
    container.appendChild(canvas);

    // Get the drawing context
    const ctx = canvas.getContext('2d');

    // Make sure we have audio data
    if (!state.audioData) {
        state.audioData = audioBuffer.getChannelData(0); // Use first channel
    }

    // Calculate the width based on audio duration and current scale
    const calculatedWidth = Math.ceil(state.audioDuration * state.timelineScale);

    // Resize canvas - use the calculated width or container width, whichever is larger
    canvas.width = Math.max(calculatedWidth, container.clientWidth);
    canvas.height = container.clientHeight;

    console.log(`Creating waveform with width: ${canvas.width}px, height: ${canvas.height}px, scale: ${state.timelineScale}px/sec`);

    // Draw waveform
    drawWaveform(ctx, state.audioData, canvas.width, canvas.height, state.timelineScale);
}

// Draw waveform with current scale
function drawWaveform(ctx, data, width, height, scale) {
    // Check if we have valid data
    if (!data || data.length === 0) {
        console.error('No audio data available for waveform');
        return;
    }

    // Set drawing styles
    ctx.fillStyle = '#4a90e2';
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;

    // Calculate amplitude and samples per pixel
    const amp = height / 2;
    const samplesPerSecond = data.length / state.audioDuration;
    const samplesPerPixel = samplesPerSecond / scale;

    console.log(`Drawing waveform: ${data.length} samples, ${samplesPerSecond.toFixed(2)} samples/sec, ${samplesPerPixel.toFixed(2)} samples/pixel`);

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Begin drawing path
    ctx.beginPath();
    ctx.moveTo(0, amp); // Start at the middle

    // Draw waveform based on current scale
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;

        // Calculate the sample range for this pixel
        const startSample = Math.floor(i * samplesPerPixel);
        const endSample = Math.floor((i + 1) * samplesPerPixel);

        // Find min and max in this segment
        for (let j = startSample; j < endSample && j < data.length; j++) {
            const datum = data[j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }

        // Draw min and max as a vertical line
        const minY = (1 + min) * amp;
        const maxY = (1 + max) * amp;

        // Ensure we're drawing visible lines
        if (minY !== maxY) {
            ctx.moveTo(i, minY);
            ctx.lineTo(i, maxY);
        } else {
            // If min equals max, draw a small line
            ctx.moveTo(i, minY - 1);
            ctx.lineTo(i, maxY + 1);
        }
    }

    // Complete the stroke
    ctx.stroke();

    // Draw a center line for reference
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.moveTo(0, amp);
    ctx.lineTo(width, amp);
    ctx.stroke();
}

// Add media item to the library
function addMediaItemToLibrary(mediaItem) {
    // Remove empty state if present
    const emptyState = mediaLibrary.querySelector('.empty-state');
    if (emptyState) {
        mediaLibrary.removeChild(emptyState);
    }

    // Create media item element
    const mediaItemElement = document.createElement('div');
    mediaItemElement.className = 'media-item';
    mediaItemElement.setAttribute('data-id', mediaItem.id);
    mediaItemElement.draggable = true;

    // Create thumbnail
    const thumbnail = document.createElement('img');
    thumbnail.src = mediaItem.src;
    thumbnail.alt = mediaItem.name;

    // Create info container
    const infoContainer = document.createElement('div');
    infoContainer.className = 'media-info';

    // Create name element
    const nameElement = document.createElement('div');
    nameElement.className = 'media-name';
    nameElement.textContent = mediaItem.name;

    // Create type element
    const typeElement = document.createElement('div');
    typeElement.className = 'media-type';
    typeElement.textContent = mediaItem.type.split('/')[1].toUpperCase();

    // Assemble media item
    infoContainer.appendChild(nameElement);
    infoContainer.appendChild(typeElement);
    mediaItemElement.appendChild(thumbnail);
    mediaItemElement.appendChild(infoContainer);

    // Add to library
    mediaLibrary.appendChild(mediaItemElement);

    // Set up drag events
    mediaItemElement.addEventListener('dragstart', handleMediaDragStart);
}

// Handle media item drag start
function handleMediaDragStart(event) {
    const mediaId = event.currentTarget.getAttribute('data-id');
    event.dataTransfer.setData('text/plain', mediaId);
    event.dataTransfer.effectAllowed = 'copy';
}

// Set up timeline interaction
function setupTimelineInteraction() {
    // Set up drop zone for image track
    imageTrack.addEventListener('dragover', event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    });

    imageTrack.addEventListener('drop', handleImageTrackDrop);

    // Set up highlight track for drag and drop
    highlightTrack.addEventListener('dragover', event => {
        event.preventDefault();
        // Show a move cursor to indicate repositioning
        event.dataTransfer.dropEffect = 'move';
    });

    // Set up click events for timeline navigation
    const timelineTracks = document.querySelector('.timeline-tracks');
    timelineTracks.addEventListener('click', handleTimelineClick);

    // Set up mouse events for timeline interaction
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Track mouse position in preview frame
    previewFrame.addEventListener('mousemove', trackMousePositionInPreview);

    // Set default mouse position to center when mouse leaves preview
    previewFrame.addEventListener('mouseleave', () => {
        state.mouseX = 50;
        state.mouseY = 50;
    });

    // Set up spacebar for adding highlights instead of mouse clicks
    document.addEventListener('keydown', handleSpacebarForHighlight);

    // Make the timeline marker draggable
    timeMarker.addEventListener('mousedown', handleTimeMarkerMouseDown);
}

// Handle dropping an image onto the timeline
function handleImageTrackDrop(event) {
    event.preventDefault();

    // Check if audio is loaded
    if (!state.audioBuffer || !state.audioDuration) {
        updateStatus('Please import audio before adding images');
        return;
    }

    // Get the media item ID
    const mediaId = event.dataTransfer.getData('text/plain');
    if (!mediaId) return;

    // Find the media item
    const mediaItem = state.mediaItems.find(item => item.id === mediaId);
    if (!mediaItem) return;

    // Calculate drop position in the timeline
    const trackRect = imageTrack.getBoundingClientRect();
    const dropX = event.clientX - trackRect.left;

    // Convert position to time
    const dropTime = dropX / state.timelineScale;

    // Default clip duration
    const defaultDuration = 3; // Default duration in seconds

    // Check if the clip would extend beyond the audio duration
    if (dropTime >= state.audioDuration) {
        updateStatus('Cannot add image beyond the end of audio');
        return;
    }

    // Adjust duration if it would extend beyond the audio duration
    const adjustedDuration = Math.min(defaultDuration, state.audioDuration - dropTime);

    // Create a new clip
    const newClip = {
        id: generateId(),
        mediaId: mediaId,
        startTime: dropTime,
        duration: adjustedDuration, // Adjusted duration to fit within audio length
        track: 'image'
    };

    // Add to clips array
    state.clips.push(newClip);

    // Create clip element
    createClipElement(newClip);

    updateStatus('Image added to timeline');
}

// Create a clip element on the timeline
function createClipElement(clip) {
    // Find the media item
    const mediaItem = state.mediaItems.find(item => item.id === clip.mediaId);
    if (!mediaItem) return;

    // Create clip element
    const clipElement = document.createElement('div');
    clipElement.className = 'timeline-clip';
    clipElement.setAttribute('data-id', clip.id);

    // Position and size the clip
    clipElement.style.left = `${clip.startTime * state.timelineScale}px`;
    clipElement.style.width = `${clip.duration * state.timelineScale}px`;

    // Add thumbnail if it's an image
    if (mediaItem.type.startsWith('image/')) {
        const thumbnail = document.createElement('img');
        thumbnail.src = mediaItem.src;
        clipElement.appendChild(thumbnail);
    }

    // Add resize handles
    const leftHandle = document.createElement('div');
    leftHandle.className = 'clip-resize-handle left';
    leftHandle.setAttribute('data-direction', 'left');

    const rightHandle = document.createElement('div');
    rightHandle.className = 'clip-resize-handle right';
    rightHandle.setAttribute('data-direction', 'right');

    // Add delete button
    const deleteButton = document.createElement('div');
    deleteButton.className = 'clip-delete-btn';
    deleteButton.innerHTML = '×';
    deleteButton.title = 'Remove clip';

    clipElement.appendChild(leftHandle);
    clipElement.appendChild(rightHandle);
    clipElement.appendChild(deleteButton);

    // Add to track
    if (clip.track === 'image') {
        imageTrack.appendChild(clipElement);
    }

    // Set up event listeners for clip interaction
    clipElement.addEventListener('mousedown', handleClipMouseDown);
    leftHandle.addEventListener('mousedown', handleResizeHandleMouseDown);
    rightHandle.addEventListener('mousedown', handleResizeHandleMouseDown);
    deleteButton.addEventListener('click', handleClipDelete);
}

// Handle mouse down on a clip
function handleClipMouseDown(event) {
    // Ignore if it's a resize handle
    if (event.target.classList.contains('clip-resize-handle')) return;

    const clipElement = event.currentTarget;
    const clipId = clipElement.getAttribute('data-id');

    // Set as selected clip
    selectClip(clipId);

    // Start dragging
    state.isDragging = true;
    state.dragStartX = event.clientX;
    state.originalLeft = parseInt(clipElement.style.left, 10) || 0;

    event.stopPropagation();
}

// Handle mouse down on a resize handle
function handleResizeHandleMouseDown(event) {
    const handle = event.target;
    const clipElement = handle.parentElement;
    const clipId = clipElement.getAttribute('data-id');

    // Set as selected clip
    selectClip(clipId);

    // Start resizing
    state.isResizing = true;
    state.resizeDirection = handle.getAttribute('data-direction');
    state.dragStartX = event.clientX;
    state.originalLeft = parseInt(clipElement.style.left, 10) || 0;
    state.originalWidth = parseInt(clipElement.style.width, 10) || 0;

    event.stopPropagation();
}

// Track mouse position in the preview frame
function trackMousePositionInPreview(event) {
    // Get mouse coordinates relative to the preview frame
    const rect = previewFrame.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Calculate position as percentage of frame dimensions
    state.mouseX = (x / rect.width) * 100;
    state.mouseY = (y / rect.height) * 100;
}

// Handle mouse down on the time marker
function handleTimeMarkerMouseDown(event) {
    // Only allow dragging if audio is loaded
    if (!state.audioBuffer) {
        updateStatus('Import audio before using the timeline marker');
        return;
    }

    // Set dragging state
    state.isDraggingMarker = true;

    // Store initial position
    state.dragStartX = event.clientX;

    // Prevent default behavior and stop propagation
    event.preventDefault();
    event.stopPropagation();

    // Add a class to indicate dragging
    timeMarker.classList.add('dragging');

    // Update status
    updateStatus('Dragging timeline marker...');
}

// Handle mouse move for dragging and resizing
function handleMouseMove(event) {
    // Check if audio is loaded
    if (!state.audioBuffer || !state.audioDuration) return;

    // Handle timeline marker dragging
    if (state.isDraggingMarker) {
        // Get the timeline tracks container
        const tracksContainer = document.querySelector('.timeline-tracks');
        const rect = tracksContainer.getBoundingClientRect();

        // Calculate new position (account for the 80px label width)
        const newX = event.clientX - rect.left - 80;

        // Ensure we don't go before the start or after the end
        const clampedX = Math.max(0, Math.min(newX, state.audioDuration * state.timelineScale));

        // Calculate new time
        const newTime = clampedX / state.timelineScale;

        // Update current time
        state.currentTime = newTime;

        // Update time marker position
        timeMarker.style.left = `${80 + clampedX}px`;

        // Update time display
        updateTimeDisplay();

        // Update preview
        updatePreview();

        return;
    }

    if (state.isDragging && state.selectedClip) {
        // Skip if it's a start screen clip (should stay at position 0)
        if (state.selectedClip.isStartScreen) return;

        // Calculate new position
        const deltaX = event.clientX - state.dragStartX;
        const newLeft = Math.max(0, state.originalLeft + deltaX);

        // Calculate new time
        const newStartTime = newLeft / state.timelineScale;

        // Calculate end time
        const newEndTime = newStartTime + state.selectedClip.duration;

        // Check if the clip would extend beyond the audio duration
        if (newEndTime > state.audioDuration) {
            // Adjust position to keep the clip within the audio duration
            const adjustedLeft = (state.audioDuration - state.selectedClip.duration) * state.timelineScale;

            // Update clip element position
            const clipElement = document.querySelector(`.timeline-clip[data-id="${state.selectedClip.id}"]`);
            clipElement.style.left = `${adjustedLeft}px`;

            // Update clip data
            state.selectedClip.startTime = state.audioDuration - state.selectedClip.duration;
        } else {
            // Update clip element position
            const clipElement = document.querySelector(`.timeline-clip[data-id="${state.selectedClip.id}"]`);
            clipElement.style.left = `${newLeft}px`;

            // Update clip data
            state.selectedClip.startTime = newStartTime;
        }

        // Update preview
        updatePreview();
    } else if (state.isResizing && state.selectedClip) {
        // Skip if it's a start screen clip (should maintain fixed duration)
        if (state.selectedClip.isStartScreen) return;

        const deltaX = event.clientX - state.dragStartX;
        const clipElement = document.querySelector(`.timeline-clip[data-id="${state.selectedClip.id}"]`);

        if (state.resizeDirection === 'left') {
            // Resize from left
            const newLeft = Math.max(0, state.originalLeft + deltaX);
            const newWidth = Math.max(50, state.originalWidth - deltaX);

            clipElement.style.left = `${newLeft}px`;
            clipElement.style.width = `${newWidth}px`;

            // Update clip data
            state.selectedClip.startTime = newLeft / state.timelineScale;
            state.selectedClip.duration = newWidth / state.timelineScale;
        } else {
            // Resize from right
            // Calculate new width
            const newWidth = Math.max(50, state.originalWidth + deltaX);

            // Calculate new end time
            const newEndTime = state.selectedClip.startTime + (newWidth / state.timelineScale);

            // Check if the clip would extend beyond the audio duration
            if (newEndTime > state.audioDuration) {
                // Adjust width to keep the clip within the audio duration
                const adjustedWidth = (state.audioDuration - state.selectedClip.startTime) * state.timelineScale;

                clipElement.style.width = `${adjustedWidth}px`;

                // Update clip data
                state.selectedClip.duration = state.audioDuration - state.selectedClip.startTime;
            } else {
                clipElement.style.width = `${newWidth}px`;

                // Update clip data
                state.selectedClip.duration = newWidth / state.timelineScale;
            }
        }

        // Update preview
        updatePreview();
    } else if (state.isDraggingHighlight && state.selectedHighlight) {
        // Calculate new position for highlight marker
        const deltaX = event.clientX - state.dragStartX;
        const newLeft = Math.max(0, state.originalLeft + deltaX);

        // Calculate new time
        const newTime = newLeft / state.timelineScale;

        // Check if the highlight would extend beyond the audio duration
        if (newTime > state.audioDuration) {
            // Adjust position to keep the highlight within the audio duration
            const adjustedLeft = state.audioDuration * state.timelineScale;

            // Update highlight marker position
            const markerElement = document.querySelector(`.highlight-marker[data-id="${state.selectedHighlight.id}"]`);
            if (markerElement) {
                markerElement.style.left = `${adjustedLeft}px`;

                // Update time label
                const timeLabel = markerElement.querySelector('.highlight-time');
                if (timeLabel) {
                    timeLabel.textContent = formatTime(state.audioDuration);
                }
            }

            // Update highlight data
            state.selectedHighlight.time = state.audioDuration;
        } else {
            // Update highlight marker position
            const markerElement = document.querySelector(`.highlight-marker[data-id="${state.selectedHighlight.id}"]`);
            if (markerElement) {
                markerElement.style.left = `${newLeft}px`;

                // Update time label
                const timeLabel = markerElement.querySelector('.highlight-time');
                if (timeLabel) {
                    timeLabel.textContent = formatTime(newTime);
                }
            }

            // Update highlight data
            state.selectedHighlight.time = newTime;
        }
    }
}

// Handle mouse up to end dragging or resizing
function handleMouseUp() {
    // Handle timeline marker dragging end
    if (state.isDraggingMarker) {
        // Remove dragging class
        timeMarker.classList.remove('dragging');

        // Add touch-ready class if not at the beginning
        if (state.currentTime > 0) {
            const previewContainer = document.querySelector('.preview-container');
            if (previewContainer) {
                previewContainer.classList.add('touch-ready');
            }
            updateStatus(`Timeline position: ${formatTime(state.currentTime)} - Press SPACEBAR to add highlight`);
        } else {
            updateStatus(`Timeline position: ${formatTime(state.currentTime)}`);
        }

        // Reset marker dragging state
        state.isDraggingMarker = false;
        return;
    }

    // Reset dragging states
    state.isDragging = false;
    state.isResizing = false;
    state.resizeDirection = null;

    // Handle highlight dragging end
    if (state.isDraggingHighlight && state.selectedHighlight) {
        // Reset cursor and selected class
        const markerElement = document.querySelector(`.highlight-marker[data-id="${state.selectedHighlight.id}"]`);
        if (markerElement) {
            markerElement.style.cursor = 'grab';
        }

        // Update status
        updateStatus(`Highlight moved to ${formatTime(state.selectedHighlight.time)}`);

        // Reset highlight dragging state
        state.isDraggingHighlight = false;
    }
}

// Import startscreen.png as a regular media item from online URL
function importStartScreenImage() {
    // Use the online URL to avoid CORS issues
    const startScreenUrl = 'https://tiboindii.github.io/FAQmov/startscreen.png';

    // Check if startscreen.png is already imported
    const existingStartScreen = state.mediaItems.find(item => item.src === startScreenUrl);
    if (existingStartScreen) {
        console.log('Start screen image already imported');
        return existingStartScreen;
    }

    // Create a new media item for the start screen
    const startScreenItem = {
        id: generateId(),
        name: 'startscreen.png',
        type: 'image/png',
        src: startScreenUrl
    };

    // Add to media items array
    state.mediaItems.push(startScreenItem);

    // Add to library
    addMediaItemToLibrary(startScreenItem);

    console.log('Start screen image imported automatically from online URL');
    return startScreenItem;
}

// Add start screen clip automatically
function addStartScreenClip() {
    // First, make sure the start screen image is imported
    const startScreenItem = importStartScreenImage();

    // Check if there's already a start screen clip at time 0 with this media ID
    const existingStartScreenClip = state.clips.find(clip =>
        clip.startTime === 0 && clip.mediaId === startScreenItem.id
    );

    if (existingStartScreenClip) {
        // Update the existing start screen clip duration to 2 seconds
        existingStartScreenClip.startTime = 0;
        existingStartScreenClip.duration = 2;

        // Update the clip element
        const clipElement = document.querySelector(`.timeline-clip[data-id="${existingStartScreenClip.id}"]`);
        if (clipElement) {
            clipElement.style.left = '0px';
            clipElement.style.width = `${2 * state.timelineScale}px`;
        }
    } else {
        // Create a new start screen clip
        const startScreenClip = {
            id: generateId(),
            mediaId: startScreenItem.id, // Use the media ID of the imported start screen
            startTime: 0,
            duration: 2, // 2 seconds duration
            track: 'image'
        };

        // Add to clips array
        state.clips.push(startScreenClip);

        // Create clip element using the standard function
        createClipElement(startScreenClip);

        console.log('Start screen clip added automatically');
    }

    // Update preview
    updatePreview();
}

// Create a start screen clip element on the timeline
function createStartScreenClipElement(clip) {
    // Create clip element
    const clipElement = document.createElement('div');
    clipElement.className = 'timeline-clip start-screen-clip';
    clipElement.setAttribute('data-id', clip.id);

    // Position and size the clip
    clipElement.style.left = `${clip.startTime * state.timelineScale}px`;
    clipElement.style.width = `${clip.duration * state.timelineScale}px`;

    // Add thumbnail with start screen image
    const thumbnail = document.createElement('img');
    thumbnail.src = state.startScreenImage;
    thumbnail.alt = 'Start Screen';
    clipElement.appendChild(thumbnail);

    // Add label
    const label = document.createElement('div');
    label.className = 'clip-label';
    label.textContent = 'Start Screen';
    clipElement.appendChild(label);

    // Add to track
    imageTrack.appendChild(clipElement);

    // Set up event listeners for clip interaction
    clipElement.addEventListener('mousedown', handleClipMouseDown);
}

// Handle clip delete button click
function handleClipDelete(event) {
    event.stopPropagation();

    // Get the clip element and ID
    const clipElement = event.target.parentElement;
    const clipId = clipElement.getAttribute('data-id');

    // Find the clip
    const clipToDelete = state.clips.find(clip => clip.id === clipId);

    // Check if it's a start screen clip
    if (clipToDelete && clipToDelete.isStartScreen) {
        // Don't allow deleting the start screen clip
        updateStatus('Start screen cannot be removed');
        return;
    }

    // Remove from clips array
    const clipIndex = state.clips.findIndex(clip => clip.id === clipId);
    if (clipIndex !== -1) {
        state.clips.splice(clipIndex, 1);
    }

    // Remove from DOM
    clipElement.remove();

    // Deselect if this was the selected clip
    if (state.selectedClip && state.selectedClip.id === clipId) {
        state.selectedClip = null;
    }

    // Update preview
    updatePreview();

    updateStatus('Clip removed from timeline');
}

// Select a clip
function selectClip(clipId) {
    // Deselect previous clip
    if (state.selectedClip) {
        const prevElement = document.querySelector(`.timeline-clip[data-id="${state.selectedClip.id}"]`);
        if (prevElement) {
            prevElement.classList.remove('selected');
        }
    }

    // Find and select new clip
    state.selectedClip = state.clips.find(clip => clip.id === clipId);

    if (state.selectedClip) {
        const clipElement = document.querySelector(`.timeline-clip[data-id="${clipId}"]`);
        clipElement.classList.add('selected');
    }
}

// Handle click on timeline for navigation
function handleTimelineClick(event) {
    if (!state.audioBuffer) return;

    // Account for the timeline labels width (80px)
    const labelsWidth = 80;
    const trackRect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - trackRect.left - labelsWidth;

    // Ensure we don't go negative
    if (clickX < 0) return;

    // Convert position to time
    const clickTime = clickX / state.timelineScale;

    // Set current time, ensuring it's within bounds
    if (clickTime <= state.audioDuration) {
        const wasPlaying = state.isPlaying;

        // Stop current playback
        if (state.isPlaying) {
            stopAudio();
            state.isPlaying = false;
        }

        // Update current time
        state.currentTime = clickTime;

        // Restart playback if it was playing
        if (wasPlaying) {
            playAudioFromTime(state.currentTime);
            state.isPlaying = true;
        }

        // Update displays
        updateTimeDisplay();
        updateTimeMarker();
        updatePreview();

        // Add touch-ready class if not at the beginning
        if (clickTime > 0) {
            const previewContainer = document.querySelector('.preview-container');
            if (previewContainer) {
                previewContainer.classList.add('touch-ready');
            }
            updateStatus(`Jumped to ${formatTime(clickTime)} - Press SPACEBAR to add highlight`);
        } else {
            updateStatus(`Jumped to ${formatTime(clickTime)}`);
        }
    } else {
        // If clicked beyond audio duration, show a message
        updateStatus(`Cannot navigate beyond the end of audio (${formatTime(state.audioDuration)})`);
    }
}

// Toggle audio playback
function togglePlayback() {
    if (!state.audioBuffer) return;

    if (state.isPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
}

// Start playback
function startPlayback() {
    if (!state.audioBuffer || state.isPlaying) return;

    playAudioFromTime(state.currentTime);
    playPauseBtn.textContent = '⏸';
    playPauseBtn.title = 'Pause';
    state.isPlaying = true;

    // Enable stop button
    stopBtn.disabled = false;

    // Add touch-ready and playing classes to preview container
    const previewContainer = document.querySelector('.preview-container');
    if (previewContainer) {
        previewContainer.classList.add('touch-ready');
        previewContainer.classList.add('playing');
    }

    // Update preview to hide start screen
    updatePreview();
    updateStatus('Position cursor and press SPACEBAR to add highlight');
}

// Pause playback
function pausePlayback() {
    if (!state.isPlaying) return;

    stopAudio();
    playPauseBtn.textContent = '▶';
    playPauseBtn.title = 'Play';
    state.isPlaying = false;

    // Keep the touch-ready class to allow adding highlights when paused
    // Only remove it if we're at the start screen (time 0)
    const previewContainer = document.querySelector('.preview-container');
    if (previewContainer) {
        // Always remove the playing class
        previewContainer.classList.remove('playing');

        if (state.currentTime === 0) {
            previewContainer.classList.remove('touch-ready');
        } else {
            // Update the status to inform user they can add highlights while paused
            updateStatus('Paused - Press SPACEBAR to add highlight at current position');
        }
    }

    // Clear any existing touch ready timeout
    if (touchReadyTimeout) {
        clearTimeout(touchReadyTimeout);
        touchReadyTimeout = null;
    }

    // Update preview - keep showing the current frame
    updatePreview();
}

// Stop playback and reset to beginning
function stopPlayback() {
    if (!state.audioBuffer) return;

    stopAudio();
    state.currentTime = 0;
    playPauseBtn.textContent = '▶';
    playPauseBtn.title = 'Play';
    state.isPlaying = false;

    // Always remove touch-ready and playing classes when stopped (since we're at time 0)
    const previewContainer = document.querySelector('.preview-container');
    if (previewContainer) {
        previewContainer.classList.remove('touch-ready');
        previewContainer.classList.remove('playing');
    }

    // Clear any existing touch ready timeout
    if (touchReadyTimeout) {
        clearTimeout(touchReadyTimeout);
        touchReadyTimeout = null;
    }

    // Update displays
    updateTimeDisplay();
    updatePreview(); // This will show the start screen since currentTime = 0
    updateStatus('Stopped - Use timeline or play button to continue');
}

// Rewind to start
function rewindToStart() {
    if (!state.audioBuffer) return;

    const wasPlaying = state.isPlaying;

    // Stop current playback
    if (state.isPlaying) {
        stopAudio();
        state.isPlaying = false;
    }

    // Reset time to beginning
    state.currentTime = 0;

    // Restart playback if it was playing
    if (wasPlaying) {
        playAudioFromTime(state.currentTime);
        state.isPlaying = true;
    } else {
        // Just update displays
        updateTimeDisplay();
        updatePreview();
    }

    updateStatus('Rewound to start');
}

// Seek relative to current position (positive or negative seconds)
function seekRelative(seconds) {
    if (!state.audioBuffer) return;

    const wasPlaying = state.isPlaying;

    // Stop current playback
    if (state.isPlaying) {
        stopAudio();
        state.isPlaying = false;
    }

    // Calculate new time, ensuring it stays within bounds
    const newTime = Math.max(0, Math.min(state.audioDuration, state.currentTime + seconds));
    state.currentTime = newTime;

    // Restart playback if it was playing
    if (wasPlaying) {
        playAudioFromTime(state.currentTime);
        state.isPlaying = true;
    } else {
        // Just update displays
        updateTimeDisplay();
        updatePreview();
    }

    const action = seconds > 0 ? 'Forward' : 'Rewind';
    updateStatus(`${action} ${Math.abs(seconds)} seconds`);
}

// Play audio from a specific time
function playAudioFromTime(startTime) {
    if (!state.audioBuffer) return;

    // Create a new audio source
    state.audioSource = state.audioContext.createBufferSource();
    state.audioSource.buffer = state.audioBuffer;

    // Connect to audio context destination
    state.audioSource.connect(state.audioContext.destination);

    // Set up ended event
    state.audioSource.onended = function() {
        // Only handle if this wasn't triggered by a stop/seek operation
        if (state.isPlaying) {
            stopPlayback();
            updateStatus('Playback complete');
        }
    };

    // Start playback
    state.audioSource.start(0, startTime);
    state.playStartTime = state.audioContext.currentTime - startTime;
}

// Stop audio playback
function stopAudio() {
    if (state.audioSource) {
        state.audioSource.stop();
        state.audioSource = null;
    }

    // Don't automatically update preview here
    // Let the calling function decide whether to update
}

// Update time marker position
function updateTimeMarker() {
    // Store previous playing state to detect changes
    const wasPlaying = state.isPlaying;

    // Update current time if playing
    if (state.isPlaying) {
        state.currentTime = state.audioContext.currentTime - state.playStartTime;

        // Check if we've reached the end
        if (state.currentTime >= state.audioDuration) {
            state.isPlaying = false;
            playPauseBtn.textContent = '▶';
            playPauseBtn.title = 'Play';
            state.currentTime = 0;
            updateStatus('Playback complete');
        }

        // Update time display
        updateTimeDisplay();

        // Update preview more frequently to ensure highlights are shown
        // We need to check for highlights more often than every half second
        // Check for any highlights that might be close to the current time
        const needsUpdate = state.highlights.some(highlight => {
            // Check if we're within 0.15 seconds of any highlight
            return Math.abs(highlight.time - state.currentTime) < 0.15;
        });

        // Update preview if we're close to a highlight or every 0.2 seconds
        if (needsUpdate || state.currentTime % 0.2 < 0.05) {
            updatePreview();
        }
    } else if (wasPlaying) {
        // If we just stopped playing, update the preview to show start screen
        updatePreview();
    }

    // Position time marker
    timeMarker.style.left = `${80 + state.currentTime * state.timelineScale}px`;

    // Request next frame
    requestAnimationFrame(updateTimeMarker);
}

// Update time display
function updateTimeDisplay() {
    const currentTimeFormatted = formatTime(state.currentTime);
    const durationFormatted = formatTime(state.audioDuration);
    timeDisplay.textContent = `${currentTimeFormatted} / ${durationFormatted}`;
}

// Format time in MM:SS format
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update timeline width based on audio duration
function updateTimelineWidth() {
    // Calculate minimum width based on container
    const tracksContainer = document.querySelector('.timeline-tracks');
    const minWidth = tracksContainer.clientWidth;

    // Calculate width based on audio duration
    let width = minWidth;
    if (state.audioDuration > 0) {
        // Lock the timeline width to exactly match the audio duration
        width = Math.max(minWidth, state.audioDuration * state.timelineScale);

        // Add a visual indicator at the end of the timeline
        addTimelineEndMarker(width);
    }

    // Set width of tracks
    audioTrack.style.width = `${width}px`;
    imageTrack.style.width = `${width}px`;
    highlightTrack.style.width = `${width}px`;

    // Update state
    state.timelineWidth = width;

    // Create time ruler markings
    createTimeRuler();
}

// Add a visual indicator at the end of the timeline
function addTimelineEndMarker(width) {
    // Remove any existing end marker
    const existingMarker = document.querySelector('.timeline-end-marker');
    if (existingMarker) {
        existingMarker.remove();
    }

    // Create end marker
    const endMarker = document.createElement('div');
    endMarker.className = 'timeline-end-marker';
    endMarker.style.position = 'absolute';
    endMarker.style.left = `${width}px`;
    endMarker.style.top = '0';
    endMarker.style.height = '100%';
    endMarker.style.width = '2px';
    endMarker.style.backgroundColor = '#ff5252'; // Red color
    endMarker.style.zIndex = '5';

    // Add a label
    const label = document.createElement('div');
    label.className = 'timeline-end-label';
    label.textContent = 'End';
    label.style.position = 'absolute';
    label.style.top = '-20px';
    label.style.left = '0';
    label.style.transform = 'translateX(-50%)';
    label.style.color = '#ff5252';
    label.style.fontWeight = 'bold';
    label.style.fontSize = '12px';

    endMarker.appendChild(label);

    // Add to timeline
    const timelineTracks = document.querySelector('.timeline-tracks');
    if (timelineTracks) {
        timelineTracks.appendChild(endMarker);
    }
}

// Create time ruler markings
function createTimeRuler() {
    if (!timeRuler) return;

    // Clear existing markings
    timeRuler.innerHTML = '';

    // Calculate number of seconds to show
    let totalSeconds;

    // If audio is loaded, use exact audio duration
    if (state.audioDuration > 0) {
        totalSeconds = Math.ceil(state.audioDuration);
    } else {
        // Otherwise use timeline width
        totalSeconds = Math.ceil(state.timelineWidth / state.timelineScale);
    }

    // Create markings
    for (let i = 0; i <= totalSeconds; i++) {
        // Create a marking every second
        const marking = document.createElement('div');
        marking.className = 'time-marking';
        marking.style.position = 'absolute';
        marking.style.left = `${i * state.timelineScale}px`;
        marking.style.height = i % 5 === 0 ? '10px' : '5px';
        marking.style.width = '1px';
        marking.style.backgroundColor = i % 5 === 0 ? '#666' : '#aaa';
        marking.style.bottom = '0'; // Position from bottom for top ruler

        // Highlight the last second marking
        if (i === totalSeconds) {
            marking.style.backgroundColor = '#ff5252'; // Red color
            marking.style.height = '15px'; // Make it taller
            marking.style.width = '2px'; // Make it wider
        }

        // Add label for every 5 seconds and for the last second
        if (i % 5 === 0 || i === totalSeconds) {
            const label = document.createElement('div');
            label.className = 'time-label';
            label.textContent = formatTime(i);
            label.style.position = 'absolute';
            label.style.left = `${i * state.timelineScale}px`;
            label.style.bottom = '12px'; // Position from bottom for top ruler
            label.style.transform = 'translateX(-50%)'; // Center the label
            label.style.fontSize = '10px';

            // Highlight the last second label
            if (i === totalSeconds) {
                label.style.color = '#ff5252'; // Red color
                label.style.fontWeight = 'bold';
            } else {
                label.style.color = '#666';
            }

            timeRuler.appendChild(label);
        }

        timeRuler.appendChild(marking);
    }
}

// Change timeline zoom level
function changeTimelineZoom(factor) {
    // Update scale
    state.timelineScale = Math.max(10, Math.min(200, state.timelineScale * factor));

    // Update timeline width
    updateTimelineWidth();

    // Update clip positions and sizes
    updateClipElements();

    // Update highlight marker positions
    updateHighlightMarkers();

    // Update time ruler with new scale
    createTimeRuler();

    // Redraw waveform with new scale if audio data exists
    updateWaveformWithCurrentScale();

    updateStatus(`Timeline zoom: ${Math.round(state.timelineScale)}px/sec`);
}

// Update waveform with current scale
function updateWaveformWithCurrentScale() {
    if (!state.audioData || !state.audioBuffer) {
        console.warn('Cannot update waveform: No audio data available');
        return;
    }

    const waveformContainer = document.querySelector('.waveform-container');
    if (!waveformContainer) {
        console.warn('Cannot update waveform: No waveform container found');
        return;
    }

    console.log('Updating waveform with current scale:', state.timelineScale);

    // Get existing canvas or create a new one
    let canvas = document.getElementById('waveformCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'waveformCanvas';
        canvas.className = 'waveform';
        waveformContainer.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');

    // Calculate the width based on audio duration and current scale
    const calculatedWidth = Math.ceil(state.audioDuration * state.timelineScale);

    // Resize canvas
    canvas.width = Math.max(calculatedWidth, waveformContainer.clientWidth);
    canvas.height = waveformContainer.clientHeight;

    // Draw waveform with current scale
    drawWaveform(ctx, state.audioData, canvas.width, canvas.height, state.timelineScale);
}

// Set zoom level to fit the entire audio clip
function setZoomToFitAudio() {
    if (!state.audioDuration) {
        updateStatus('No audio loaded. Import audio first.');
        return;
    }

    // Get the timeline container width
    const timelineContainer = document.querySelector('.timeline-tracks');
    if (!timelineContainer) return;

    // Calculate available width (subtract 100px for labels and padding)
    const availableWidth = timelineContainer.clientWidth - 100;

    // Calculate the scale needed to fit the entire audio
    const fitScale = availableWidth / state.audioDuration;

    // Set the scale, ensuring it's within reasonable bounds
    state.timelineScale = Math.max(10, Math.min(200, fitScale));

    console.log(`Fitting to audio: duration=${state.audioDuration}s, available width=${availableWidth}px, scale=${state.timelineScale}px/sec`);

    // Update timeline width
    updateTimelineWidth();

    // Update clip positions and sizes
    updateClipElements();

    // Update highlight marker positions
    updateHighlightMarkers();

    // Update time ruler with new scale
    createTimeRuler();

    // Redraw waveform with new scale if audio data exists
    updateWaveformWithCurrentScale();

    updateStatus(`Timeline zoomed to fit audio (${Math.round(state.timelineScale)}px/sec)`);
}

// Update highlight marker positions after zoom change
function updateHighlightMarkers() {
    // Update all highlight markers on the timeline
    state.highlights.forEach(highlight => {
        const markerElement = document.querySelector(`.highlight-marker[data-id="${highlight.id}"]`);
        if (markerElement) {
            markerElement.style.left = `${highlight.time * state.timelineScale}px`;
        }
    });
}

// Update touch action positions after zoom change
function updateTouchActionPositions() {
    // Update all touch action clips on the timeline
    state.touchActions.forEach(action => {
        const clip = document.querySelector(`.touch-action-clip[data-id="${action.id}"]`);
        if (clip) {
            // Position consistently with image clips (80px offset is added by the track)
            clip.style.left = `${action.startTime * state.timelineScale}px`;
            clip.style.width = `${action.duration * state.timelineScale}px`;

            // Update position info text
            const posInfo = clip.querySelector('.pos-info');
            if (posInfo) {
                posInfo.textContent = formatTime(action.startTime);
            }
        }
    });
}

// Update clip elements after zoom change
function updateClipElements() {
    state.clips.forEach(clip => {
        const clipElement = document.querySelector(`.timeline-clip[data-id="${clip.id}"]`);
        if (clipElement) {
            clipElement.style.left = `${clip.startTime * state.timelineScale}px`;
            clipElement.style.width = `${clip.duration * state.timelineScale}px`;
        }
    });
}

// Update preview frame with current content
function updatePreview() {
    // Clear previous content
    previewFrame.innerHTML = '';

    // If we're at the beginning (time = 0) and not playing, show the start screen
    if (state.currentTime === 0 && !state.isPlaying) {
        // Import the start screen image if needed
        const startScreenItem = importStartScreenImage();

        // Create an image element for the start screen
        const img = document.createElement('img');
        img.src = startScreenItem.src; // This is the online URL
        img.style.position = 'absolute';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.left = '0';
        img.style.top = '0';
        previewFrame.appendChild(img);

        // Add title if available
        if (state.videoTitle) {
            // Create title container without background
            const titleContainer = document.createElement('div');
            titleContainer.className = 'title-container';
            titleContainer.style.position = 'absolute';
            titleContainer.style.top = '50%';
            titleContainer.style.left = '50%';
            titleContainer.style.transform = 'translate(-50%, -50%)';
            titleContainer.style.padding = '20px 40px';
            titleContainer.style.textAlign = 'center';

            // Create title element with dark green text
            const titleElement = document.createElement('div');
            titleElement.className = 'start-screen-title';
            titleElement.textContent = state.videoTitle;
            titleElement.style.color = '#016362'; // Dark green color
            titleElement.style.fontSize = '42px'; // Larger font size for better visibility
            titleElement.style.fontWeight = 'bold';
            titleElement.style.textShadow = '0 2px 4px rgba(255, 255, 255, 0.5)'; // Light shadow for contrast

            // Add title to container
            titleContainer.appendChild(titleElement);
            previewFrame.appendChild(titleContainer);
        }

        return;
    }

    // Check for clips at the beginning of the timeline (for start screen)
    const startScreenClip = state.clips.find(clip => {
        const startScreenItem = state.mediaItems.find(item => item.src === 'https://tiboindii.github.io/FAQmov/startscreen.png');
        return clip.startTime === 0 &&
               clip.mediaId === startScreenItem?.id &&
               state.currentTime >= clip.startTime &&
               state.currentTime < (clip.startTime + clip.duration);
    });

    // If a start screen clip is active and we're not playing, show it and return
    if (startScreenClip && !state.isPlaying) {
        // Import the start screen image if needed
        const startScreenItem = importStartScreenImage();

        // Create an image element for the start screen
        const img = document.createElement('img');
        img.src = startScreenItem.src; // This is the online URL
        img.style.position = 'absolute';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.left = '0';
        img.style.top = '0';
        previewFrame.appendChild(img);

        // Add title if available
        if (state.videoTitle) {
            // Create title container without background
            const titleContainer = document.createElement('div');
            titleContainer.className = 'title-container';
            titleContainer.style.position = 'absolute';
            titleContainer.style.top = '50%';
            titleContainer.style.left = '50%';
            titleContainer.style.transform = 'translate(-50%, -50%)';
            titleContainer.style.padding = '20px 40px';
            titleContainer.style.textAlign = 'center';

            // Create title element with dark green text
            const titleElement = document.createElement('div');
            titleElement.className = 'start-screen-title';
            titleElement.textContent = state.videoTitle;
            titleElement.style.color = '#016362'; // Dark green color
            titleElement.style.fontSize = '42px'; // Larger font size for better visibility
            titleElement.style.fontWeight = 'bold';
            titleElement.style.textShadow = '0 2px 4px rgba(255, 255, 255, 0.5)'; // Light shadow for contrast

            // Add title to container
            titleContainer.appendChild(titleElement);
            previewFrame.appendChild(titleContainer);
        }

        return;
    }

    // Find clips that should be visible at current time
    const visibleClips = state.clips.filter(clip => {
        return state.currentTime >= clip.startTime &&
               state.currentTime < (clip.startTime + clip.duration);
    });

    // Sort by track (audio first, then images)
    visibleClips.sort((a, b) => {
        if (a.track === b.track) return 0;
        return a.track === 'audio' ? -1 : 1;
    });

    // Add visible clips to preview
    visibleClips.forEach(clip => {
        const mediaItem = state.mediaItems.find(item => item.id === clip.mediaId);
        if (!mediaItem) return;

        if (mediaItem.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = mediaItem.src;
            img.style.position = 'absolute';
            img.style.width = '100%';
            img.style.height = '100%';
            // Use 'contain' to ensure the entire image is visible within the portrait frame
            img.style.objectFit = 'contain';
            // Center the image in the portrait frame
            img.style.left = '0';
            img.style.top = '0';
            previewFrame.appendChild(img);
        }
    });

    // Add highlight animations at the current time
    const activeHighlights = state.highlights.filter(highlight => {
        // Show highlights that are at the current time (with a larger tolerance)
        const tolerance = 0.15; // 150ms tolerance (increased from 100ms)
        return Math.abs(highlight.time - state.currentTime) < tolerance;
    });

    // Add active highlights to preview
    const previewContainer = document.querySelector('.preview-container');

    if (activeHighlights.length > 0) {
        console.log(`Showing ${activeHighlights.length} highlights at time ${state.currentTime.toFixed(2)}`);

        // Add highlight-active class to preview container
        if (previewContainer) {
            previewContainer.classList.add('highlight-active');

            // Remove the class after the animation duration
            setTimeout(() => {
                previewContainer.classList.remove('highlight-active');
            }, 2000); // Match the highlight animation duration
        }
    }

    activeHighlights.forEach(highlight => {
        // Create highlight animation element
        const highlightElement = document.createElement('div');
        highlightElement.className = 'highlight-animation';

        // Position at the stored coordinates
        highlightElement.style.left = `${highlight.x}%`;
        highlightElement.style.top = `${highlight.y}%`;

        // No text label anymore - just the circle animation

        // Add to preview frame
        previewFrame.appendChild(highlightElement);

        // Remove after animation completes
        setTimeout(() => {
            if (highlightElement.parentNode) {
                highlightElement.parentNode.removeChild(highlightElement);
            }
        }, 2000); // Match the CSS animation duration (2s)
    });

    // Show empty state if no clips and playing past the start screen
    if (visibleClips.length === 0 && state.isPlaying && state.currentTime >= 3) {
        const emptyPreview = document.createElement('div');
        emptyPreview.className = 'empty-preview';
        emptyPreview.innerHTML = '<p>Portrait Preview<br>(1284×2778px)</p>';
        previewFrame.appendChild(emptyPreview);
    }
}

// Save project
function saveProject() {
    // Create project data
    const projectData = {
        name: state.projectName,
        clips: state.clips,
        highlights: state.highlights,
        audioDuration: state.audioDuration,
        videoTitle: state.videoTitle,
        startScreenImage: state.startScreenImage,
        mediaItems: state.mediaItems.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            src: item.src
        })),
        audioFile: state.audioFile ? {
            id: state.audioFile.id,
            name: state.audioFile.name,
            type: state.audioFile.type,
            src: state.audioFile.src
        } : null
    };

    // Convert to JSON
    const projectJson = JSON.stringify(projectData);

    // Create download link
    const blob = new Blob([projectJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.projectName.replace(/\s+/g, '_')}.indii`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    updateStatus('Project saved');
}

// Export movie
function exportMovie() {
    // Check if there's audio and at least one clip
    if (!state.audioBuffer) {
        alert('Please import audio before exporting a movie.');
        return;
    }

    if (state.clips.length === 0) {
        alert('Please add at least one image to the timeline before exporting.');
        return;
    }

    // Show format selection modal
    showExportFormatModal();
}

// Start the export process after format selection
function startExport() {
    updateStatus(`Preparing to export movie in ${state.exportFormat.toUpperCase()} format...`);

    // Create a hidden canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = 1284;
    canvas.height = 2778;
    document.body.appendChild(canvas);
    canvas.style.display = 'none';

    const ctx = canvas.getContext('2d');

    // Create a hidden video element to display the canvas recording
    const videoPreview = document.createElement('video');
    videoPreview.controls = true;
    videoPreview.style.display = 'none';
    document.body.appendChild(videoPreview);

    // Set up MediaRecorder
    const stream = canvas.captureStream(30); // 30 FPS

    // Create an audio context for the export
    const exportAudioContext = new AudioContext();

    // Note: We're using the state.audioBuffer directly which already has
    // 3 seconds of silence at the beginning from the audio import process.
    // This ensures the audio timing in the export matches the preview.
    const exportAudioSource = exportAudioContext.createBufferSource();
    exportAudioSource.buffer = state.audioBuffer;

    console.log(`Export audio duration: ${state.audioBuffer.duration.toFixed(2)}s with 3s silence at start`);

    // Connect audio to the stream
    const audioDestination = exportAudioContext.createMediaStreamDestination();
    exportAudioSource.connect(audioDestination);

    // Add audio track to the stream
    const audioTrack = audioDestination.stream.getAudioTracks()[0];
    stream.addTrack(audioTrack);

    // Configure MediaRecorder based on selected format
    let mimeTypes = [];

    // Set MIME types based on selected format
    if (state.exportFormat === 'mp4') {
        mimeTypes = [
            'video/mp4',
            'video/mp4;codecs=h264',
            'video/mp4;codecs=avc1',
            'video/webm;codecs=h264', // Fallback
            'video/webm;codecs=vp9',  // Fallback
            'video/webm'              // Last resort fallback
        ];
    } else if (state.exportFormat === 'webm') {
        mimeTypes = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
    } else if (state.exportFormat === 'avi') {
        // AVI isn't directly supported by MediaRecorder
        // We'll use WebM and convert it later
        mimeTypes = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];

        console.log('AVI format selected - will use WebM for recording and convert to AVI');
    }

    let options = {
        videoBitsPerSecond: 5000000 // 5 Mbps
    };

    let recorder;
    let selectedMimeType = '';

    // Find the first supported MIME type
    for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
            selectedMimeType = mimeType;
            options.mimeType = mimeType;
            console.log(`Using MIME type: ${mimeType} for ${state.exportFormat} export`);
            break;
        }
    }

    if (!selectedMimeType) {
        console.error('No supported MIME type found');
        alert('Your browser does not support the required video format. Please try a different format or browser.');
        updateStatus('Export failed - Format not supported');
        return;
    }

    try {
        recorder = new MediaRecorder(stream, options);
    } catch (e) {
        console.error('MediaRecorder error:', e);
        alert('Your browser does not support the required video format. Please try a different format or browser.');
        updateStatus('Export failed - Browser not supported');
        return;
    }

    // Store the selected MIME type for later use
    state.exportMimeType = selectedMimeType;

    // Set up recording data
    const chunks = [];
    recorder.ondataavailable = e => {
        if (e.data.size > 0) {
            chunks.push(e.data);
        }
    };

    // Handle recording completion
    recorder.onstop = () => {
        // Determine the correct file extension and blob type based on the selected format
        let fileExtension = state.exportFormat;
        let blobType = 'video/webm';

        if (state.exportMimeType.includes('mp4')) {
            blobType = 'video/mp4';
        }

        // Create a blob from the recorded chunks
        const blob = new Blob(chunks, { type: blobType });

        // For AVI format, we need to handle conversion
        if (state.exportFormat === 'avi') {
            // Show a message about AVI conversion
            updateStatus('Converting to AVI format...');

            // Create a video element to load the WebM for conversion
            const tempVideo = document.createElement('video');
            tempVideo.style.display = 'none';
            document.body.appendChild(tempVideo);

            // Create a URL for the blob
            const webmUrl = URL.createObjectURL(blob);
            tempVideo.src = webmUrl;

            // When the video is loaded, we can start the conversion process
            tempVideo.onloadedmetadata = () => {
                // Create a canvas for the conversion
                const conversionCanvas = document.createElement('canvas');
                conversionCanvas.width = tempVideo.videoWidth;
                conversionCanvas.height = tempVideo.videoHeight;
                conversionCanvas.style.display = 'none';
                document.body.appendChild(conversionCanvas);

                const ctx = conversionCanvas.getContext('2d');

                // Create a download link for the AVI file
                const a = document.createElement('a');
                a.download = `${state.projectName.replace(/\s+/g, '_')}.${fileExtension}`;
                document.body.appendChild(a);

                // Clean up original elements
                document.body.removeChild(canvas);

                // Show the exported video in a modal for preview
                // We'll still show the WebM version for preview since browsers can't display AVI
                showExportedVideoPreview(webmUrl, 'avi (preview as WebM)');

                // Show success message
                updateStatus(`Movie exported successfully as ${fileExtension.toUpperCase()}!`);

                // Create a data URL for the AVI file
                // Note: This is a simplified approach - in a real implementation,
                // we would use a proper library like ffmpeg.js to convert to AVI
                // For now, we'll just rename the WebM file to AVI
                a.href = webmUrl;

                // Trigger download
                a.click();

                // Clean up
                document.body.removeChild(a);

                // We'll revoke the URL after the user closes the preview
                // URL.revokeObjectURL(webmUrl) will be called in hideVideoPreview
            };

            tempVideo.onerror = () => {
                alert('Error loading video for conversion. Please try a different format.');
                updateStatus('Export failed - Conversion error');
                URL.revokeObjectURL(webmUrl);
                document.body.removeChild(tempVideo);
            };

            // Load the video to trigger onloadedmetadata
            tempVideo.load();
        } else {
            // Standard MP4 or WebM export
            // Create a download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.projectName.replace(/\s+/g, '_')}.${fileExtension}`;
            document.body.appendChild(a);

            // Clean up
            document.body.removeChild(canvas);

            // Show the exported video in a modal for preview
            showExportedVideoPreview(url, fileExtension);

            // Show success message
            updateStatus(`Movie exported successfully as ${fileExtension.toUpperCase()}!`);

            // Trigger download
            a.click();

            // Clean up
            document.body.removeChild(a);

            // We'll revoke the URL after the user closes the preview
            // URL.revokeObjectURL(url) will be called in hideVideoPreview
        }
    };

    // Show export progress modal
    showExportModal();

    // We'll start recording and audio playback after images are loaded

    // Animation frame time tracking
    let startTime;
    const duration = state.audioDuration * 1000; // Convert to milliseconds
    const frameRate = 30; // frames per second
    const frameDuration = 1000 / frameRate; // milliseconds per frame

    // Preload all images that will be used in the movie
    const allImagePromises = [];
    const allImageElements = {};

    // Create a map of all clips and highlights by time for faster lookup
    const clipsByTime = {};
    const highlightsByTime = {};

    // Use the exact audio duration for the export (locked to audio length)
    const exactDuration = state.audioDuration;
    console.log(`Using exact audio duration for export: ${exactDuration.toFixed(2)}s`);

    // Calculate total frames based on exact audio duration
    const frameCount = Math.ceil(exactDuration * frameRate);

    console.log(`Preparing to export ${frameCount} frames at ${frameRate} fps for ${state.audioDuration.toFixed(2)}s of audio`);

    // Load the startscreen.png file from the online URL and add title overlay
    const startScreenPromise = new Promise((resolve) => {
        console.log("Loading startscreen.png from online URL and preparing title overlay");

        // Import the start screen image to get the online URL
        const startScreenItem = importStartScreenImage();

        // Load the background image from the online URL
        const backgroundImg = new Image();
        backgroundImg.crossOrigin = "anonymous"; // Important for CORS

        backgroundImg.onload = () => {
            console.log(`Startscreen.png loaded successfully from online URL: ${backgroundImg.width}x${backgroundImg.height}`);

            // Store the background image
            allImageElements['startScreenBackground'] = backgroundImg;
            // Also store it with the media ID for use in clips
            allImageElements[startScreenItem.id] = backgroundImg;

            // Create a separate title overlay if there's a title
            if (state.videoTitle) {
                // Create a canvas just for the title with transparent background
                const titleCanvas = document.createElement('canvas');
                titleCanvas.width = 1284;
                titleCanvas.height = 2778;
                const titleCtx = titleCanvas.getContext('2d');

                // Make sure the canvas is transparent
                titleCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);

                // Save context state
                titleCtx.save();

                // Set text properties
                titleCtx.textAlign = 'center';

                // Calculate font size based on canvas dimensions
                const fontSize = Math.floor(titleCanvas.width / 10); // Larger font size for better visibility
                titleCtx.font = `bold ${fontSize}px Arial, sans-serif`;

                // Add shadow for better contrast
                titleCtx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                titleCtx.shadowBlur = 10;
                titleCtx.shadowOffsetX = 2;
                titleCtx.shadowOffsetY = 2;

                // Draw the title text in dark green
                titleCtx.fillStyle = '#016362'; // Dark green color
                titleCtx.fillText(state.videoTitle, titleCanvas.width / 2, titleCanvas.height / 2);

                // Restore context state
                titleCtx.restore();

                // Convert the title canvas to an image
                const titleImg = new Image();
                titleImg.onload = () => {
                    console.log("Title overlay created successfully");
                    // Store the title overlay
                    allImageElements['startScreenTitle'] = titleImg;
                    resolve({ background: backgroundImg, title: titleImg });
                };

                // Set the source to trigger loading
                titleImg.src = titleCanvas.toDataURL('image/png');

                console.log(`Added title "${state.videoTitle}" as separate overlay`);
            } else {
                // No title, just resolve with the background
                resolve({ background: backgroundImg, title: null });
            }
        };

        backgroundImg.onerror = (e) => {
            console.error("Error loading startscreen.png from online URL:", e);

            // Create a fallback image
            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.width = 1284;
            fallbackCanvas.height = 2778;
            const fallbackCtx = fallbackCanvas.getContext('2d');

            // Fill with the header color
            fallbackCtx.fillStyle = '#016362';
            fallbackCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);

            // Convert to image
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
                console.log("Using fallback for start screen background");
                allImageElements['startScreenBackground'] = fallbackImg;
                // Also store it with the media ID for use in clips
                allImageElements[startScreenItem.id] = fallbackImg;

                // Create title overlay if needed
                if (state.videoTitle) {
                    // Create a canvas for the title
                    const titleCanvas = document.createElement('canvas');
                    titleCanvas.width = 1284;
                    titleCanvas.height = 2778;
                    const titleCtx = titleCanvas.getContext('2d');

                    // Clear the canvas
                    titleCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);

                    // Set up text properties for dark green text
                    titleCtx.textAlign = 'center';
                    const fontSize = Math.floor(titleCanvas.width / 10); // Larger font size for better visibility
                    titleCtx.font = `bold ${fontSize}px Arial, sans-serif`;

                    // Add shadow for better contrast
                    titleCtx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                    titleCtx.shadowBlur = 10;
                    titleCtx.shadowOffsetX = 2;
                    titleCtx.shadowOffsetY = 2;

                    // Draw the title text in dark green
                    titleCtx.fillStyle = '#016362'; // Dark green color
                    titleCtx.fillText(state.videoTitle, titleCanvas.width / 2, titleCanvas.height / 2);

                    // Convert to image
                    const titleImg = new Image();
                    titleImg.onload = () => {
                        console.log("Title overlay created for fallback");
                        allImageElements['startScreenTitle'] = titleImg;
                        resolve({ background: fallbackImg, title: titleImg });
                    };

                    titleImg.src = titleCanvas.toDataURL('image/png');
                } else {
                    // No title needed
                    resolve({ background: fallbackImg, title: null });
                }
            };

            fallbackImg.src = fallbackCanvas.toDataURL('image/png');
        };

        // Set the source to trigger loading - use the online URL
        backgroundImg.src = startScreenItem.src; // This is the online URL
    });

    // Make sure we prioritize loading the start screen image
    allImagePromises.unshift(startScreenPromise); // Add to the beginning of the array

    // Preload all images that will be used in the movie
    state.clips.forEach(clip => {
        const mediaItem = state.mediaItems.find(item => item.id === clip.mediaId);
        if (!mediaItem) {
            console.error(`Media item not found for clip with mediaId: ${clip.mediaId}`);
            return;
        }

        if (!mediaItem.type.startsWith('image/')) {
            console.log(`Skipping non-image media item: ${mediaItem.type}`);
            return;
        }

        // Only load each image once
        if (!allImageElements[mediaItem.id]) {
            console.log(`Preloading image for media item: ${mediaItem.name}`);

            const promise = new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous"; // Add this to avoid CORS issues

                img.onload = () => {
                    console.log(`Image loaded for ${mediaItem.name}: ${img.width}x${img.height}`);
                    resolve(img);
                };

                img.onerror = (e) => {
                    console.error(`Error loading image for ${mediaItem.name}:`, e);
                    // Resolve anyway to continue with the export
                    resolve(null);
                };

                // Set the source to trigger loading
                img.src = mediaItem.src;

                // Store the image element
                allImageElements[mediaItem.id] = img;
            });

            allImagePromises.push(promise);
        }

        // Map clip to each frame it appears in
        const startFrame = Math.floor(clip.startTime * frameRate);
        const endFrame = Math.ceil((clip.startTime + clip.duration) * frameRate);

        console.log(`Mapping clip ${clip.mediaId} from frame ${startFrame} to ${endFrame} (${clip.startTime.toFixed(2)}s to ${(clip.startTime + clip.duration).toFixed(2)}s)`);

        for (let frame = startFrame; frame < endFrame && frame < frameCount; frame++) {
            if (!clipsByTime[frame]) {
                clipsByTime[frame] = [];
            }
            clipsByTime[frame].push(clip);
        }
    });

    // Map highlights to each frame they appear in
    state.highlights.forEach(highlight => {
        // Calculate the exact frame for this highlight
        // Use Math.round to get the closest frame to the exact time
        // Note: No need to add 3 seconds here as the highlight.time already includes the offset
        // since it's based on the timeline which already has the 3-second offset
        const exactFrame = Math.round(highlight.time * frameRate);

        // Calculate the frame range for the animation duration
        const startFrame = exactFrame;
        const endFrame = Math.ceil((highlight.time + highlight.duration) * frameRate);

        console.log(`Mapping highlight at exact frame ${exactFrame} (${highlight.time.toFixed(3)}s) with duration ${highlight.duration}s`);

        for (let frame = startFrame; frame < endFrame && frame < frameCount; frame++) {
            if (!highlightsByTime[frame]) {
                highlightsByTime[frame] = [];
            }

            // Store the exact frame number to calculate precise progress
            const highlightWithExactFrame = {
                ...highlight,
                exactFrame: exactFrame
            };

            highlightsByTime[frame].push(highlightWithExactFrame);
        }
    });

    // Wait for all images to load before starting the rendering
    Promise.all(allImagePromises)
        .then((loadedImages) => {
            console.log('All images loaded, starting export...');

            // Count successfully loaded images
            const successfullyLoaded = loadedImages.filter(img => img !== null).length;
            console.log(`Successfully loaded ${successfullyLoaded} out of ${loadedImages.length} images`);

            // Check if we have any images to render
            if (successfullyLoaded === 0 && state.clips.length > 0) {
                console.warn("No images were successfully loaded, but clips exist. Export may be blank.");
            }

            startTime = performance.now();

            // Request data from the recorder every second
            recorder.start(1000);

            // Start audio playback
            exportAudioSource.start();

            // Start rendering frames
            renderNextFrame(0);
        })
        .catch((error) => {
            console.error("Error loading images:", error);
            alert("There was an error loading images for export. The export will continue but may not include all images.");

            startTime = performance.now();

            // Request data from the recorder every second
            recorder.start(1000);

            // Start audio playback
            exportAudioSource.start();

            // Start rendering frames
            renderNextFrame(0);
        });

    // Render a specific frame
    function renderFrame(frameNumber) {
        // Calculate time for this frame
        const currentTime = frameNumber / frameRate;

        // Log every second for debugging
        if (frameNumber % frameRate === 0) {
            console.log(`Rendering frame ${frameNumber} at time ${currentTime.toFixed(2)}s`);
        }

        // Clear canvas with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Show start screen for the first 60 frames (2 seconds at 30fps)
        // Note: The first 3 seconds of audio are silent, with the first 2 seconds showing the start screen
        if (frameNumber < 60) { // Show for full 2 seconds to match the start screen clip
            console.log(`Rendering start screen for frame ${frameNumber} (time: ${(frameNumber/frameRate).toFixed(2)}s)`);

            // Find the start screen media item
            const startScreenItem = state.mediaItems.find(item => item.name === 'startscreen.webp' ||
                                                                 item.name === 'startscreen.jpg' ||
                                                                 item.name === 'startscreen.png');

            // First fill with a fallback color
            ctx.fillStyle = '#016362';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (startScreenItem && allImageElements[startScreenItem.id]) {
                // Use the image directly from the media item
                const img = allImageElements[startScreenItem.id];

                if (img && img.complete && img.naturalWidth > 0) {
                    console.log("Drawing startscreen.png from online URL");

                    try {
                        // Draw the image using our helper function
                        drawImageToCanvas(img, ctx, canvas.width, canvas.height);
                        console.log("Start screen drawn successfully");
                    } catch (e) {
                        console.error("Error drawing start screen image:", e);
                        // Fallback already applied (green background)
                    }
                } else {
                    console.log("Start screen image not fully loaded, using fallback color");
                }
            } else {
                console.log("Start screen image not available, using fallback color");
            }

            // Add title if available
            if (state.videoTitle) {
                console.log("Adding title overlay to start screen");

                // Set up text properties for dark green text
                const fontSize = Math.floor(canvas.width / 10); // Larger font size for better visibility
                ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                ctx.textAlign = 'center';

                // Add shadow for better contrast
                ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                // Draw the title text in dark green
                ctx.fillStyle = '#016362'; // Dark green color
                ctx.fillText(state.videoTitle, canvas.width / 2, canvas.height / 2);

                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                console.log("Title overlay added successfully");
            }

            // Update progress and return
            const progress = (frameNumber / frameCount) * 100;
            updateExportProgress(Math.min(100, progress));
            return;
        }

        // Get clips visible at this frame
        const visibleClips = clipsByTime[frameNumber] || [];

        if (visibleClips.length === 0) {
            console.log(`No clips visible at frame ${frameNumber}, time ${currentTime.toFixed(2)}s`);
        } else {
            console.log(`Found ${visibleClips.length} clips at frame ${frameNumber}, time ${currentTime.toFixed(2)}s`);
        }

        // Sort by track (audio first, then images)
        visibleClips.sort((a, b) => {
            if (a.track === b.track) return 0;
            return a.track === 'audio' ? -1 : 1;
        });

        // Draw all visible clips to canvas
        let drawnImages = 0;
        visibleClips.forEach(clip => {
            const mediaItem = state.mediaItems.find(item => item.id === clip.mediaId);
            if (!mediaItem) {
                console.error(`Media item not found for clip with mediaId: ${clip.mediaId}`);
                return;
            }

            if (!mediaItem.type.startsWith('image/')) {
                console.log(`Skipping non-image media item: ${mediaItem.type}`);
                return;
            }

            const img = allImageElements[mediaItem.id];
            if (!img) {
                console.error(`Image element not found for mediaId: ${mediaItem.id}`);
                return;
            }

            if (!img.complete || img.naturalWidth === 0) {
                console.error(`Image not fully loaded for mediaId: ${mediaItem.id}`);
                return;
            }

            // Draw the image
            console.log(`Drawing image for clip at time ${clip.startTime.toFixed(2)}s, duration ${clip.duration.toFixed(2)}s`);
            drawImageToCanvas(img, ctx, canvas.width, canvas.height);
            drawnImages++;
        });

        console.log(`Drew ${drawnImages} images for frame ${frameNumber}`);

        // Draw highlights for this frame
        const activeHighlights = highlightsByTime[frameNumber] || [];
        if (activeHighlights.length > 0) {
            console.log(`Drawing ${activeHighlights.length} highlights for frame ${frameNumber}`);

            // Save context state
            ctx.save();

            // Draw each highlight
            activeHighlights.forEach(highlight => {
                // Calculate animation progress (0 to 1) using the exact frame
                const exactStartFrame = highlight.exactFrame; // Use the stored exact frame
                const highlightProgress = (frameNumber - exactStartFrame) / (highlight.duration * frameRate);

                // Ensure progress is between 0 and 1
                const clampedProgress = Math.max(0, Math.min(1, highlightProgress));

                console.log(`Drawing highlight at frame ${frameNumber}, time ${currentTime.toFixed(3)}s, exact start: ${exactStartFrame} (${(exactStartFrame/frameRate).toFixed(3)}s), progress: ${clampedProgress.toFixed(3)}`);

                // Draw the highlight pulse
                drawHighlightPulse(ctx, highlight.x / 100 * canvas.width, highlight.y / 100 * canvas.height, clampedProgress);
            });

            // Restore context state
            ctx.restore();
        }

        // Update progress in the modal
        const progress = (frameNumber / frameCount) * 100;
        updateExportProgress(Math.min(100, progress));
    }

    // Note: The drawVideoTitle function has been removed as we now pre-render the title
    // directly into the start screen image for better reliability

    // Draw a highlight pulse animation
    function drawHighlightPulse(ctx, x, y, progress) {
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
        const gradient = ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius);
        gradient.addColorStop(0, `rgba(1, 99, 98, ${opacity * 0.8})`); // Dark green color
        gradient.addColorStop(1, `rgba(1, 99, 98, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw inner circle with red border
        ctx.fillStyle = `rgba(1, 99, 98, ${opacity * 0.9})`; // Dark green color
        ctx.strokeStyle = `rgba(255, 0, 0, ${opacity * 0.9})`; // Changed to red border
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // Helper function to draw images with proper aspect ratio
    function drawImageToCanvas(img, ctx, canvasWidth, canvasHeight) {
        // Check if the image is valid
        if (!img || !img.complete || img.naturalWidth === 0) {
            console.error("Invalid image passed to drawImageToCanvas");
            // Draw a placeholder instead
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Draw an error message
            ctx.fillStyle = '#ff0000';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Image not available', canvasWidth / 2, canvasHeight / 2);
            return;
        }

        // Save the current context state
        ctx.save();

        try {
            // Calculate dimensions to maintain aspect ratio
            const imgAspect = img.naturalWidth / img.naturalHeight;
            const canvasAspect = canvasWidth / canvasHeight;

            let drawWidth, drawHeight, drawX, drawY;

            if (imgAspect > canvasAspect) {
                // Image is wider than canvas (relative to height)
                drawWidth = canvasWidth;
                drawHeight = canvasWidth / imgAspect;
                drawX = 0;
                drawY = (canvasHeight - drawHeight) / 2;
            } else {
                // Image is taller than canvas (relative to width)
                drawHeight = canvasHeight;
                drawWidth = canvasHeight * imgAspect;
                drawX = (canvasWidth - drawWidth) / 2;
                drawY = 0;
            }

            // Draw the image
            console.log(`Drawing image: ${img.naturalWidth}x${img.naturalHeight} at ${drawX},${drawY} with size ${drawWidth}x${drawHeight}`);
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        } catch (e) {
            console.error("Error drawing image to canvas:", e);
            // Draw a placeholder instead
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Draw an error message
            ctx.fillStyle = '#ff0000';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Error drawing image', canvasWidth / 2, canvasHeight / 2);
        } finally {
            // Restore the context state
            ctx.restore();
        }
    }

    // Render frames sequentially
    function renderNextFrame(frameNumber) {
        // Render the current frame
        renderFrame(frameNumber);

        // Schedule the next frame or finish
        if (frameNumber < frameCount) {
            // Use setTimeout to ensure consistent frame timing
            setTimeout(() => {
                renderNextFrame(frameNumber + 1);
            }, frameDuration);
        } else {
            // Stop recording when done
            setTimeout(() => {
                recorder.stop();
                exportAudioSource.stop();
                hideExportModal();
            }, 1000); // Give a second to ensure all frames are captured
        }
    }
}

// Show export format selection modal
function showExportFormatModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('exportFormatModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'exportFormatModal';
        modal.className = 'export-modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'export-modal-content';

        const title = document.createElement('h3');
        title.textContent = 'Export Movie';

        const description = document.createElement('p');
        description.textContent = 'Choose the format for your exported movie:';
        description.className = 'export-description';

        // Create format selection
        const formatContainer = document.createElement('div');
        formatContainer.className = 'format-selection-container';

        // Format dropdown
        const formatSelect = document.createElement('select');
        formatSelect.id = 'formatSelect';
        formatSelect.className = 'format-select';

        // Add format options
        const formats = [
            { value: 'mp4', label: 'MP4 - Most compatible format' },
            { value: 'webm', label: 'WebM - Good for web' },
            { value: 'avi', label: 'AVI - Classic video format' }
        ];

        formats.forEach(format => {
            const option = document.createElement('option');
            option.value = format.value;
            option.textContent = format.label;
            if (format.value === state.exportFormat) {
                option.selected = true;
            }
            formatSelect.appendChild(option);
        });

        formatSelect.addEventListener('change', (e) => {
            state.exportFormat = e.target.value;
        });

        formatContainer.appendChild(formatSelect);

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = hideExportFormatModal;

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn primary';
        exportBtn.textContent = 'Export';
        exportBtn.onclick = () => {
            hideExportFormatModal();
            startExport();
        };

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(exportBtn);

        // Assemble modal
        modalContent.appendChild(title);
        modalContent.appendChild(description);
        modalContent.appendChild(formatContainer);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);
    } else {
        // Update the selected format
        const formatSelect = document.getElementById('formatSelect');
        if (formatSelect) {
            formatSelect.value = state.exportFormat;
        }
    }

    modal.style.display = 'flex';
}

// Hide export format modal
function hideExportFormatModal() {
    const modal = document.getElementById('exportFormatModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show export progress modal
function showExportModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('exportModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'exportModal';
        modal.className = 'export-modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'export-modal-content';

        const title = document.createElement('h3');
        title.textContent = 'Exporting Movie';

        const formatInfo = document.createElement('p');
        formatInfo.id = 'exportFormatInfo';
        formatInfo.className = 'export-format-info';
        formatInfo.textContent = `Format: ${state.exportFormat.toUpperCase()}`;

        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';

        const progressBar = document.createElement('div');
        progressBar.id = 'exportProgress';
        progressBar.className = 'progress-bar';

        const progressText = document.createElement('div');
        progressText.id = 'exportProgressText';
        progressText.className = 'progress-text';
        progressText.textContent = '0%';

        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);

        modalContent.appendChild(title);
        modalContent.appendChild(formatInfo);
        modalContent.appendChild(progressContainer);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);
    } else {
        // Update format info
        const formatInfo = document.getElementById('exportFormatInfo');
        if (formatInfo) {
            formatInfo.textContent = `Format: ${state.exportFormat.toUpperCase()}`;
        }
    }

    modal.style.display = 'flex';
}

// Update export progress
function updateExportProgress(percent) {
    const progressBar = document.getElementById('exportProgress');
    const progressText = document.getElementById('exportProgressText');

    if (progressBar && progressText) {
        const roundedPercent = Math.round(percent);
        progressBar.style.width = `${roundedPercent}%`;
        progressText.textContent = `${roundedPercent}%`;
    }
}

// Hide export modal
function hideExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show exported video preview
function showExportedVideoPreview(videoUrl, fileExtension) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('videoPreviewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'videoPreviewModal';
        modal.className = 'video-preview-modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'video-preview-content';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'video-preview-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = hideVideoPreview;

        const title = document.createElement('h3');
        title.textContent = 'Exported Video Preview';

        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';

        const video = document.createElement('video');
        video.id = 'previewVideo';
        video.controls = true;
        video.autoplay = true;
        video.style.width = '100%';

        const downloadInfo = document.createElement('p');
        downloadInfo.className = 'download-info';
        downloadInfo.innerHTML = `Your video has been exported as <strong>${fileExtension.toUpperCase()}</strong> format and should download automatically. If not, you can download it directly from this preview.`;

        const downloadBtn = document.createElement('a');
        downloadBtn.className = 'btn primary download-btn';
        downloadBtn.innerHTML = `Download ${fileExtension.toUpperCase()} Video`;
        downloadBtn.href = videoUrl;
        downloadBtn.download = `${state.projectName.replace(/\s+/g, '_')}.${fileExtension.split(' ')[0]}`; // Handle "avi (preview as WebM)" case

        videoContainer.appendChild(video);
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(videoContainer);
        modalContent.appendChild(downloadInfo);
        modalContent.appendChild(downloadBtn);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);
    }

    // Set video source
    const video = document.getElementById('previewVideo');
    if (video) {
        video.src = videoUrl;
    }

    // Update download button
    const downloadBtn = modal.querySelector('.download-btn');
    if (downloadBtn) {
        downloadBtn.href = videoUrl;
        downloadBtn.download = `${state.projectName.replace(/\s+/g, '_')}.${fileExtension.split(' ')[0]}`;
        downloadBtn.innerHTML = `Download ${fileExtension.toUpperCase()} Video`;
    }

    // Update info text
    const downloadInfo = modal.querySelector('.download-info');
    if (downloadInfo) {
        downloadInfo.innerHTML = `Your video has been exported as <strong>${fileExtension.toUpperCase()}</strong> format and should download automatically. If not, you can download it directly from this preview.`;
    }

    // Show modal
    modal.style.display = 'flex';
}

// Hide video preview modal
function hideVideoPreview() {
    const modal = document.getElementById('videoPreviewModal');
    if (modal) {
        // Get video element
        const video = document.getElementById('previewVideo');
        if (video) {
            // Pause video
            video.pause();

            // Get video URL
            const videoUrl = video.src;

            // Clear video source
            video.src = '';

            // Revoke object URL to free memory
            URL.revokeObjectURL(videoUrl);
        }

        modal.style.display = 'none';
    }
}

// Confirm new project
function confirmNewProject() {
    if (confirm('Start a new project? All unsaved changes will be lost.')) {
        location.reload();
    }
}

// Handle spacebar press to add highlight markers
function handleSpacebarForHighlight(event) {
    // Only respond to spacebar key (key code 32)
    if (event.keyCode !== 32 && event.key !== ' ') {
        return;
    }

    // Prevent default spacebar action (which might scroll the page)
    event.preventDefault();

    // Only add highlights if audio is loaded (now works in both playing and paused states)
    if (!state.audioBuffer) {
        updateStatus('Import audio before adding highlights');
        return;
    }

    // If paused, show a different status message
    if (!state.isPlaying) {
        // Check if we're at the start screen (time 0)
        if (state.currentTime === 0) {
            updateStatus('Move timeline position before adding highlights');
            return;
        }
    }

    // Use the current mouse position for the highlight position
    // (state.mouseX and state.mouseY are updated by the trackMousePositionInPreview function)

    // Create a new highlight at the current time
    const newHighlight = {
        id: generateId(),
        time: state.currentTime,
        x: state.mouseX,
        y: state.mouseY,
        duration: 2.0 // Duration of the highlight animation in seconds
    };

    // Add to highlights array
    state.highlights.push(newHighlight);

    // Create highlight marker in timeline
    createHighlightMarker(newHighlight);

    // Show a temporary highlight animation in the preview
    showHighlightAnimation(newHighlight);

    updateStatus(`Highlight added at ${formatTime(state.currentTime)}`);
}

// Create a highlight marker in the timeline
function createHighlightMarker(highlight) {
    // Create marker element
    const markerElement = document.createElement('div');
    markerElement.className = 'highlight-marker';
    markerElement.setAttribute('data-id', highlight.id);

    // Position the marker
    markerElement.style.left = `${highlight.time * state.timelineScale}px`;

    // Add label with time
    const timeLabel = document.createElement('div');
    timeLabel.className = 'highlight-time';
    timeLabel.textContent = formatTime(highlight.time);
    markerElement.appendChild(timeLabel);

    // Add delete button
    const deleteButton = document.createElement('div');
    deleteButton.className = 'highlight-delete-btn';
    deleteButton.innerHTML = '×';
    deleteButton.title = 'Remove highlight';
    markerElement.appendChild(deleteButton);

    // Add to highlight track
    highlightTrack.appendChild(markerElement);

    // Set up event listeners
    markerElement.addEventListener('mousedown', handleHighlightMouseDown);
    deleteButton.addEventListener('click', handleHighlightDelete);
}

// Handle mouse down on a highlight marker
function handleHighlightMouseDown(event) {
    // Ignore if it's the delete button
    if (event.target.classList.contains('highlight-delete-btn')) return;

    const markerElement = event.currentTarget;
    const highlightId = markerElement.getAttribute('data-id');

    // Find the highlight
    const highlight = state.highlights.find(h => h.id === highlightId);
    if (!highlight) return;

    // Set as selected highlight
    selectHighlight(highlightId);

    // Start dragging
    state.isDraggingHighlight = true;
    state.dragStartX = event.clientX;
    state.originalLeft = parseInt(markerElement.style.left, 10) || 0;

    // Change cursor
    markerElement.style.cursor = 'grabbing';

    event.stopPropagation();
}

// Select a highlight
function selectHighlight(highlightId) {
    // Deselect previous highlight
    if (state.selectedHighlight) {
        const prevElement = document.querySelector(`.highlight-marker[data-id="${state.selectedHighlight.id}"]`);
        if (prevElement) {
            prevElement.classList.remove('selected');
        }
    }

    // Find and select new highlight
    const highlight = state.highlights.find(h => h.id === highlightId);
    if (highlight) {
        state.selectedHighlight = highlight;

        // Add selected class
        const element = document.querySelector(`.highlight-marker[data-id="${highlightId}"]`);
        if (element) {
            element.classList.add('selected');
        }
    }
}

// Handle highlight delete button click
function handleHighlightDelete(event) {
    event.stopPropagation();

    // Get the marker element and ID
    const markerElement = event.target.parentElement;
    const highlightId = markerElement.getAttribute('data-id');

    // Remove from highlights array
    const highlightIndex = state.highlights.findIndex(h => h.id === highlightId);
    if (highlightIndex !== -1) {
        state.highlights.splice(highlightIndex, 1);
    }

    // Remove from DOM
    markerElement.remove();

    // Deselect if this was the selected highlight
    if (state.selectedHighlight && state.selectedHighlight.id === highlightId) {
        state.selectedHighlight = null;
    }

    updateStatus('Highlight removed');
}

// Show a temporary highlight animation in the preview
function showHighlightAnimation(highlight) {
    // Create highlight element
    const highlightElement = document.createElement('div');
    highlightElement.className = 'highlight-animation';

    // Position at the click coordinates
    highlightElement.style.left = `${highlight.x}%`;
    highlightElement.style.top = `${highlight.y}%`;

    // No text label anymore - just the circle animation

    // Add to preview frame
    previewFrame.appendChild(highlightElement);

    // Remove after animation completes
    setTimeout(() => {
        if (highlightElement.parentNode) {
            highlightElement.parentNode.removeChild(highlightElement);
        }
    }, 2000); // Match the CSS animation duration (2s)
}

// Handle project import
function handleProjectImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is a project file (.indii)
    if (file.name.endsWith('.indii')) {
        // Confirm if there are unsaved changes
        if (state.clips.length > 0 || state.highlights.length > 0) {
            if (!confirm('Loading a project will replace your current work. Continue?')) {
                // Reset input
                event.target.value = '';
                return;
            }
        }

        // Load the project
        loadProject(file);
    } else {
        alert('Please select a valid project file (.indii)');
    }

    // Reset input
    event.target.value = '';
}

// Update status message
function updateStatus(message) {
    statusBar.textContent = message;
}

// Generate a unique ID
function generateId() {
    return Math.random().toString(36).substring(2, 11);
}

// Load project from file
function loadProject(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        processProjectData(e.target.result);
    };

    reader.onerror = function() {
        alert('Error reading project file');
        updateStatus('Error reading project file');
    };

    reader.readAsText(file);
}

// Load project from URL
function loadProjectFromURL(url) {
    updateStatus('Loading project from URL...');

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            processProjectData(data);
        })
        .catch(error => {
            console.error('Error loading project from URL:', error);
            alert('Error loading project from URL. Please try again later.');
            updateStatus('Error loading project from URL');
        });
}

// Process project data (common function for both file and URL loading)
function processProjectData(projectDataText) {
    try {
        // Parse project data
        const projectData = JSON.parse(projectDataText);

        // Reset current state
        state.clips = [];
        state.highlights = [];
        state.mediaItems = [];
        state.audioFile = null;
        state.audioBuffer = null;
        state.audioDuration = 0;
        state.currentTime = 0;

        // Clear UI elements
        mediaLibrary.innerHTML = '';
        imageTrack.innerHTML = '';
        highlightTrack.innerHTML = '';
        audioTrack.innerHTML = '<div class="empty-track">Import audio to create timeline</div>';

        // Update project name
        state.projectName = projectData.name || 'Imported Project';

        // Update video title
        state.videoTitle = projectData.videoTitle || '';
        if (videoTitleInput) {
            videoTitleInput.value = state.videoTitle;
        }

        // Load media items
        if (projectData.mediaItems && Array.isArray(projectData.mediaItems)) {
            projectData.mediaItems.forEach(item => {
                state.mediaItems.push(item);
                addMediaItemToLibrary(item);
            });
        }

        // Load audio file
        if (projectData.audioFile) {
            state.audioFile = projectData.audioFile;
            processAudioFile(projectData.audioFile.src);
        }

        // Load clips after audio is processed
        const loadClipsAndHighlights = () => {
            // Load clips
            if (projectData.clips && Array.isArray(projectData.clips)) {
                projectData.clips.forEach(clip => {
                    state.clips.push(clip);
                    createClipElement(clip);
                });
            }

            // Load highlights
            if (projectData.highlights && Array.isArray(projectData.highlights)) {
                projectData.highlights.forEach(highlight => {
                    state.highlights.push(highlight);
                    createHighlightMarker(highlight);
                });
            }

            // Update timeline width
            updateTimelineWidth();

            // Update preview
            updatePreview();

            updateStatus('Project loaded successfully');
        };

        // If audio is being processed, wait for it to complete
        if (projectData.audioFile) {
            const checkAudioLoaded = () => {
                if (state.audioBuffer) {
                    loadClipsAndHighlights();

                    // Enable all playback controls
                    playPauseBtn.disabled = false;
                    stopBtn.disabled = false;
                    rewindStartBtn.disabled = false;
                    rewindStepBtn.disabled = false;
                    forwardStepBtn.disabled = false;

                    console.log('Playback controls enabled after project load');
                } else {
                    setTimeout(checkAudioLoaded, 100);
                }
            };
            checkAudioLoaded();
        } else {
            loadClipsAndHighlights();
        }
    } catch (error) {
        console.error('Error loading project:', error);
        alert('Error loading project. The file may be corrupted or in an invalid format.');
        updateStatus('Error loading project');
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
