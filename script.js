// DOM Elements
const importImagesBtn = document.getElementById('importImages');
const importAudioBtn = document.getElementById('importAudio');
const imageInput = document.getElementById('imageInput');
const audioInput = document.getElementById('audioInput');
const mediaLibrary = document.getElementById('mediaLibrary');
const audioTrack = document.getElementById('audioTrack');
const imageTrack = document.getElementById('imageTrack');
const touchTrack = document.getElementById('touchTrack');
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
    touchActions: [], // Array to store touch actions
    selectedClip: null,
    isDragging: false,
    isResizing: false,
    resizeDirection: null,
    dragStartX: 0,
    dragStartY: 0,
    originalLeft: 0,
    originalWidth: 0,
    projectName: 'New Project',
    previewScale: 0.2,
    videoTitle: '',
    startScreenImage: 'startscreen.jpg',
    touchColor: '#ff0000', // Changed to red for better visibility
    exportMimeType: '', // Will store the selected MIME type for export
};

// Initialize the application
function init() {
    // Set up event listeners
    importImagesBtn.addEventListener('click', () => imageInput.click());
    importAudioBtn.addEventListener('click', () => audioInput.click());
    imageInput.addEventListener('change', handleImageImport);
    audioInput.addEventListener('change', handleAudioImport);

    // Playback controls
    playPauseBtn.addEventListener('click', togglePlayback);
    stopBtn.addEventListener('click', stopPlayback);
    rewindStartBtn.addEventListener('click', rewindToStart);
    rewindStepBtn.addEventListener('click', () => seekRelative(-5)); // Rewind 5 seconds
    forwardStepBtn.addEventListener('click', () => seekRelative(5)); // Forward 5 seconds

    // Touch action controls
    previewFrame.addEventListener('click', handlePreviewClick);

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

    // Process each file
    Array.from(files).forEach(file => {
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

                state.mediaItems.push(mediaItem);
                addMediaItemToLibrary(mediaItem);
            };

            reader.readAsDataURL(file);
        }
    });

    // Reset input
    event.target.value = '';
    updateStatus('Images imported');
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

    // Decode audio data
    fetch(audioSrc)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => state.audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            state.audioBuffer = audioBuffer;
            state.audioDuration = audioBuffer.duration;

            // Set zoom level to fit the entire audio clip first
            // This will determine the optimal scale for the waveform
            setZoomToFitAudio();

            // Create waveform visualization with the current scale
            createWaveform(audioBuffer, waveformContainer);

            // Update timeline width based on audio duration
            updateTimelineWidth();

            // Update time display
            updateTimeDisplay();

            // Log the adjustment
            console.log(`Audio loaded: ${state.audioDuration.toFixed(2)}s, Scale: ${state.timelineScale.toFixed(2)}px/sec`);
        })
        .catch(error => {
            console.error('Error decoding audio data', error);
            updateStatus('Error processing audio');
        });
}

// Create audio waveform visualization
function createWaveform(audioBuffer, container) {
    // Clear any existing waveform
    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    canvas.className = 'waveform';
    canvas.id = 'waveformCanvas';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const data = audioBuffer.getChannelData(0); // Use first channel

    // Store the audio data in the state for reuse when zooming
    if (!state.audioData) {
        state.audioData = data;
    }

    // Calculate the width based on audio duration and current scale
    const calculatedWidth = Math.ceil(state.audioDuration * state.timelineScale) + 80; // Add 80px for labels

    // Resize canvas - use the calculated width or container width, whichever is larger
    canvas.width = Math.max(calculatedWidth, container.clientWidth);
    canvas.height = container.clientHeight;

    // Draw waveform
    drawWaveform(ctx, data, canvas.width, canvas.height, state.timelineScale);
}

// Draw waveform with current scale
function drawWaveform(ctx, data, width, height, scale) {
    ctx.fillStyle = '#4a90e2';
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;

    const amp = height / 2;
    const samplesPerSecond = data.length / state.audioDuration;
    const samplesPerPixel = samplesPerSecond / scale;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();

    // Start at the middle
    ctx.moveTo(0, amp);

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
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }

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

    // Set up click events for timeline navigation
    const timelineTracks = document.querySelector('.timeline-tracks');
    timelineTracks.addEventListener('click', handleTimelineClick);

    // Set up mouse events for timeline interaction
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

// Handle dropping an image onto the timeline
function handleImageTrackDrop(event) {
    event.preventDefault();

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

    // Create a new clip
    const newClip = {
        id: generateId(),
        mediaId: mediaId,
        startTime: dropTime,
        duration: 3, // Default duration in seconds
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

// Handle mouse move for dragging and resizing
function handleMouseMove(event) {
    if (state.isDragging && state.selectedClip) {
        // Calculate new position
        const deltaX = event.clientX - state.dragStartX;
        const newLeft = Math.max(0, state.originalLeft + deltaX);

        // Update clip element position
        const clipElement = document.querySelector(`.timeline-clip[data-id="${state.selectedClip.id}"]`);
        clipElement.style.left = `${newLeft}px`;

        // Update clip data
        state.selectedClip.startTime = newLeft / state.timelineScale;

        // Update preview
        updatePreview();
    } else if (state.isResizing && state.selectedClip) {
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
            const newWidth = Math.max(50, state.originalWidth + deltaX);

            clipElement.style.width = `${newWidth}px`;

            // Update clip data
            state.selectedClip.duration = newWidth / state.timelineScale;
        }

        // Update preview
        updatePreview();
    }
}

// Handle mouse up to end dragging or resizing
function handleMouseUp() {
    state.isDragging = false;
    state.isResizing = false;
    state.resizeDirection = null;
}

// Handle clip delete button click
function handleClipDelete(event) {
    event.stopPropagation();

    // Get the clip element and ID
    const clipElement = event.target.parentElement;
    const clipId = clipElement.getAttribute('data-id');

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

        updateStatus(`Jumped to ${formatTime(clickTime)}`);
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

    // Update preview to hide start screen
    updatePreview();
    updateStatus('Playing');
}

// Pause playback
function pausePlayback() {
    if (!state.isPlaying) return;

    stopAudio();
    playPauseBtn.textContent = '▶';
    playPauseBtn.title = 'Play';
    state.isPlaying = false;

    // Update preview - keep showing the current frame
    updatePreview();
    updateStatus('Paused');
}

// Stop playback and reset to beginning
function stopPlayback() {
    if (!state.audioBuffer) return;

    stopAudio();
    state.currentTime = 0;
    playPauseBtn.textContent = '▶';
    playPauseBtn.title = 'Play';
    state.isPlaying = false;

    // Update displays
    updateTimeDisplay();
    updatePreview(); // This will show the start screen since currentTime = 0
    updateStatus('Stopped');
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

        // Only update preview during playback if needed
        // This prevents constant rebuilding of the DOM
        if (state.currentTime % 0.5 < 0.1) { // Update roughly every half second
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
        width = Math.max(minWidth, state.audioDuration * state.timelineScale);
    }

    // Set width of tracks
    audioTrack.style.width = `${width}px`;
    imageTrack.style.width = `${width}px`;
    touchTrack.style.width = `${width}px`;

    // Update state
    state.timelineWidth = width;

    // Create time ruler markings
    createTimeRuler();
}

// Create time ruler markings
function createTimeRuler() {
    if (!timeRuler) return;

    // Clear existing markings
    timeRuler.innerHTML = '';

    // Calculate number of seconds to show
    const totalSeconds = Math.ceil(state.timelineWidth / state.timelineScale);

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

        // Add label for every 5 seconds
        if (i % 5 === 0) {
            const label = document.createElement('div');
            label.className = 'time-label';
            label.textContent = formatTime(i);
            label.style.position = 'absolute';
            label.style.left = `${i * state.timelineScale}px`;
            label.style.bottom = '12px'; // Position from bottom for top ruler
            label.style.transform = 'translateX(-50%)'; // Center the label
            label.style.fontSize = '10px';
            label.style.color = '#666';
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

    // Update touch action positions
    updateTouchActionPositions();

    // Update time ruler with new scale
    createTimeRuler();

    // Redraw waveform with new scale if audio data exists
    updateWaveformWithCurrentScale();

    updateStatus(`Timeline zoom: ${Math.round(state.timelineScale)}px/sec`);
}

// Update waveform with current scale
function updateWaveformWithCurrentScale() {
    if (!state.audioData || !state.audioBuffer) return;

    const waveformContainer = document.querySelector('.waveform-container');
    if (!waveformContainer) return;

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
    const calculatedWidth = Math.ceil(state.audioDuration * state.timelineScale) + 80;

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

    // Update touch action positions
    updateTouchActionPositions();

    // Update time ruler with new scale
    createTimeRuler();

    // Redraw waveform with new scale if audio data exists
    updateWaveformWithCurrentScale();

    updateStatus(`Timeline zoomed to fit audio (${Math.round(state.timelineScale)}px/sec)`);
}

// Update touch action positions after zoom change
function updateTouchActionPositions() {
    // Update all touch action clips on the timeline
    state.touchActions.forEach(action => {
        const clip = document.querySelector(`.touch-action-clip[data-id="${action.id}"]`);
        if (clip) {
            clip.style.left = `${80 + action.startTime * state.timelineScale}px`;
            clip.style.width = `${action.duration * state.timelineScale}px`;
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

    // Only show start screen when at the beginning (time = 0) and not playing
    if (state.currentTime === 0 && !state.isPlaying) {
        // Create start screen
        const startScreen = document.createElement('div');
        startScreen.className = 'start-screen';
        startScreen.style.backgroundImage = `url('${state.startScreenImage}')`;

        // Add title if available
        if (state.videoTitle) {
            const titleElement = document.createElement('div');
            titleElement.className = 'start-screen-title';
            titleElement.textContent = state.videoTitle;
            startScreen.appendChild(titleElement);
        }

        previewFrame.appendChild(startScreen);
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

    // Add touch actions that should be visible at current time
    const visibleTouchActions = state.touchActions.filter(action => {
        return state.currentTime >= action.startTime &&
               state.currentTime < (action.startTime + action.duration);
    });

    // Add touch actions to preview
    visibleTouchActions.forEach(action => {
        const touchAction = document.createElement('div');
        touchAction.className = 'touch-action';
        touchAction.style.left = `${action.x}px`;
        touchAction.style.top = `${action.y}px`;

        // Create pulse animation
        const pulse = document.createElement('div');
        pulse.className = 'touch-pulse';

        // Create center dot
        const dot = document.createElement('div');
        dot.className = 'touch-dot';

        touchAction.appendChild(pulse);
        touchAction.appendChild(dot);
        previewFrame.appendChild(touchAction);
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
        touchActions: state.touchActions,
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

    updateStatus('Preparing to export movie...');

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
    const exportAudioSource = exportAudioContext.createBufferSource();
    exportAudioSource.buffer = state.audioBuffer;

    // Connect audio to the stream
    const audioDestination = exportAudioContext.createMediaStreamDestination();
    exportAudioSource.connect(audioDestination);

    // Add audio track to the stream
    const audioTrack = audioDestination.stream.getAudioTracks()[0];
    stream.addTrack(audioTrack);

    // Configure MediaRecorder with MP4 support
    // Try different MIME types in order of preference
    const mimeTypes = [
        'video/mp4',
        'video/mp4;codecs=h264',
        'video/mp4;codecs=avc1',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm'
    ];

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
            console.log(`Using MIME type: ${mimeType}`);
            break;
        }
    }

    try {
        recorder = new MediaRecorder(stream, options);
    } catch (e) {
        console.error('MediaRecorder error:', e);
        alert('Your browser does not support the required video format. Please try a different browser.');
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
        // Determine the correct file extension based on the MIME type
        let fileExtension = 'mp4';
        let blobType = 'video/mp4';

        if (state.exportMimeType.includes('webm')) {
            fileExtension = 'webm';
            blobType = 'video/webm';
        }

        // Create a blob from the recorded chunks
        const blob = new Blob(chunks, { type: blobType });

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

        // We'll revoke the URL after the user closes the preview
        // URL.revokeObjectURL(url) will be called in hideVideoPreview
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

    // Create a map of all clips and touch actions by time for faster lookup
    const clipsByTime = {};
    const touchActionsByTime = {};
    const frameCount = Math.ceil(state.audioDuration * frameRate);

    // Preload all images that will be used in the movie
    state.clips.forEach(clip => {
        const mediaItem = state.mediaItems.find(item => item.id === clip.mediaId);
        if (!mediaItem || !mediaItem.type.startsWith('image/')) return;

        // Only load each image once
        if (!allImageElements[mediaItem.id]) {
            const promise = new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.src = mediaItem.src;
                allImageElements[mediaItem.id] = img;
            });

            allImagePromises.push(promise);
        }

        // Map clip to each frame it appears in
        const startFrame = Math.floor(clip.startTime * frameRate);
        const endFrame = Math.ceil((clip.startTime + clip.duration) * frameRate);

        for (let frame = startFrame; frame < endFrame && frame < frameCount; frame++) {
            if (!clipsByTime[frame]) {
                clipsByTime[frame] = [];
            }
            clipsByTime[frame].push(clip);
        }
    });

    // Map touch actions to frames
    state.touchActions.forEach(action => {
        const startFrame = Math.floor(action.startTime * frameRate);
        const endFrame = Math.ceil((action.startTime + action.duration) * frameRate);

        for (let frame = startFrame; frame < endFrame && frame < frameCount; frame++) {
            if (!touchActionsByTime[frame]) {
                touchActionsByTime[frame] = [];
            }
            touchActionsByTime[frame].push(action);
        }
    });

    // Wait for all images to load before starting the rendering
    Promise.all(allImagePromises).then(() => {
        console.log('All images loaded, starting export...');
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

        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Show start screen only for the first frame (or first few frames for a smoother transition)
        if (frameNumber < 5) { // Show for first 5 frames (about 1/6 of a second at 30fps)
            // Load and draw start screen
            const startScreenImg = new Image();
            startScreenImg.src = state.startScreenImage;

            // Draw the start screen image
            if (startScreenImg.complete) {
                drawImageToCanvas(startScreenImg, ctx, canvas.width, canvas.height);
            } else {
                startScreenImg.onload = () => {
                    drawImageToCanvas(startScreenImg, ctx, canvas.width, canvas.height);
                };
            }

            // Add title if available
            if (state.videoTitle) {
                // Set text properties
                ctx.fillStyle = 'white';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.shadowBlur = 20;
                ctx.textAlign = 'center';

                // Calculate font size based on canvas dimensions
                const fontSize = Math.floor(canvas.width / 15);
                ctx.font = `bold ${fontSize}px Arial, sans-serif`;

                // Draw background for text
                const textWidth = ctx.measureText(state.videoTitle).width;
                const padding = fontSize;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(
                    (canvas.width - textWidth) / 2 - padding,
                    canvas.height / 2 - fontSize - padding / 2,
                    textWidth + padding * 2,
                    fontSize * 2 + padding
                );

                // Draw text
                ctx.fillStyle = 'white';
                ctx.fillText(state.videoTitle, canvas.width / 2, canvas.height / 2);
            }

            // Update progress and return
            const progress = (frameNumber / frameCount) * 100;
            updateExportProgress(Math.min(100, progress));
            return;
        }

        // Get clips visible at this frame
        const visibleClips = clipsByTime[frameNumber] || [];

        // Sort by track (audio first, then images)
        visibleClips.sort((a, b) => {
            if (a.track === b.track) return 0;
            return a.track === 'audio' ? -1 : 1;
        });

        // Draw all visible clips to canvas
        visibleClips.forEach(clip => {
            const mediaItem = state.mediaItems.find(item => item.id === clip.mediaId);
            if (!mediaItem || !mediaItem.type.startsWith('image/')) return;

            const img = allImageElements[mediaItem.id];
            if (!img) return;

            // Draw the image
            drawImageToCanvas(img, ctx, canvas.width, canvas.height);
        });

        // Draw touch actions for this frame
        const touchActions = touchActionsByTime[frameNumber] || [];
        touchActions.forEach(action => {
            // Calculate animation progress (0 to 1)
            const actionStartFrame = Math.floor(action.startTime * frameRate);
            const actionProgress = (frameNumber - actionStartFrame) / (action.duration * frameRate);

            // Draw touch action
            drawTouchAction(ctx, action.x, action.y, actionProgress);
        });

        // Update progress in the modal
        const progress = (frameNumber / frameCount) * 100;
        updateExportProgress(Math.min(100, progress));
    }

    // Helper function to draw a touch action on the canvas
    function drawTouchAction(ctx, x, y, progress) {
        // Set up the touch action style
        ctx.save();

        // Set global alpha for 50% transparency
        ctx.globalAlpha = 0.5;

        // Draw the outer pulse circle
        const maxRadius = 250; // Increased by another 250% from 100
        const radius = maxRadius * (progress * 1.5); // Increased zoom-out size

        // Create gradient for pulse
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)'); // Changed to red
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)'); // Changed to red

        // Draw pulse circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw center dot
        ctx.beginPath();
        ctx.arc(x, y, 62.5, 0, Math.PI * 2); // Increased by another 250% from 25
        ctx.fillStyle = '#ff0000'; // Changed to red
        ctx.fill();

        ctx.restore();
    }

    // Helper function to draw images with proper aspect ratio
    function drawImageToCanvas(img, ctx, canvasWidth, canvasHeight) {
        // Calculate dimensions to maintain aspect ratio
        const imgAspect = img.width / img.height;
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
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
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
        modalContent.appendChild(progressContainer);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);
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
        downloadBtn.download = `${state.projectName.replace(/\s+/g, '_')}.${fileExtension}`;

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
        downloadBtn.download = `${state.projectName.replace(/\s+/g, '_')}.${fileExtension}`;
        downloadBtn.innerHTML = `Download ${fileExtension.toUpperCase()} Video`;
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

// Handle click on preview frame to add touch action
function handlePreviewClick(event) {
    // Only add touch actions when playing
    if (!state.isPlaying) {
        updateStatus('Start playback to add touch actions');
        return;
    }

    // Get click position relative to the preview frame
    const rect = previewFrame.getBoundingClientRect();

    // Calculate position considering the scale
    const x = (event.clientX - rect.left) / state.previewScale;
    const y = (event.clientY - rect.top) / state.previewScale;

    // Add touch action at current time and position
    addTouchAction(x, y, state.currentTime);
}

// Add touch action at specified position and time
function addTouchAction(x, y, startTime) {
    // Create new touch action
    const touchAction = {
        id: generateId(),
        x: x,
        y: y,
        startTime: startTime,
        duration: 1.5, // 1.5 seconds duration for touch animation
        track: 'touch'
    };

    // Add to state
    state.touchActions.push(touchAction);

    // Add to timeline
    addTouchActionToTimeline(touchAction);

    // Update preview
    updatePreview();

    updateStatus('Touch action added');
}

// This function has been removed as the +Touch button is no longer needed
// Touch actions are now added directly by clicking on the preview during playback

// Add touch action to timeline
function addTouchActionToTimeline(touchAction) {
    // Create clip element
    const clip = document.createElement('div');
    clip.className = 'clip touch-action-clip';
    clip.dataset.id = touchAction.id;
    clip.dataset.track = 'touch';

    // Position and size based on time - ensure exact positioning
    // The 80px offset accounts for the timeline labels width
    clip.style.left = `${80 + touchAction.startTime * state.timelineScale}px`;
    clip.style.width = `${touchAction.duration * state.timelineScale}px`;

    // Create label container
    const labelContainer = document.createElement('div');
    labelContainer.style.display = 'flex';
    labelContainer.style.alignItems = 'center';

    // Add touch icon and label
    const touchLabel = document.createElement('span');
    touchLabel.textContent = 'Touch';

    // Add position info to make it clearer
    const posInfo = document.createElement('span');
    posInfo.textContent = ` (${formatTime(touchAction.startTime)})`;
    posInfo.style.fontSize = '10px';
    posInfo.style.opacity = '0.8';

    labelContainer.appendChild(touchLabel);
    labelContainer.appendChild(posInfo);
    clip.appendChild(labelContainer);

    // Add delete button with improved styling
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'touch-remove-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = 'Remove touch action';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeTouchAction(touchAction.id);
    });

    clip.appendChild(deleteBtn);

    // Add to touch track
    touchTrack.appendChild(clip);

    // Log for debugging
    console.log(`Added touch action at ${formatTime(touchAction.startTime)}, position: ${touchAction.x.toFixed(0)},${touchAction.y.toFixed(0)}`);
}

// Remove touch action
function removeTouchAction(id) {
    // Remove from state
    state.touchActions = state.touchActions.filter(action => action.id !== id);

    // Remove from timeline
    const clip = document.querySelector(`.clip[data-id="${id}"]`);
    if (clip) {
        clip.remove();
    }

    // Update preview
    updatePreview();

    updateStatus('Touch action removed');
}

// Update status message
function updateStatus(message) {
    statusBar.textContent = message;
}

// Generate a unique ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
