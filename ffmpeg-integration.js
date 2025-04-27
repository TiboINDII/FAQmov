// FFmpeg.wasm integration for INDII Movie Creator
// This file handles video export using FFmpeg.wasm

// FFmpeg.wasm state
let ffmpeg = null;
let ffmpegLoaded = false;
let ffmpegLoading = false;

// Initialize FFmpeg.wasm
async function initFFmpeg() {
  if (ffmpegLoaded) {
    return ffmpeg;
  }

  if (ffmpegLoading) {
    // Wait for the existing loading process to complete
    return new Promise((resolve) => {
      const checkLoaded = () => {
        if (ffmpegLoaded) {
          resolve(ffmpeg);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });
  }

  ffmpegLoading = true;
  updateStatus('Loading FFmpeg.wasm...');

  try {
    // Import the FFmpeg module dynamically
    const { createFFmpeg, fetchFile } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');

    // Create FFmpeg instance
    ffmpeg = createFFmpeg({
      log: true,
      corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
      progress: ({ ratio }) => {
        updateExportProgress(ratio * 100);
      }
    });

    // Load FFmpeg
    await ffmpeg.load();
    ffmpegLoaded = true;
    ffmpegLoading = false;
    console.log('FFmpeg.wasm loaded successfully');
    updateStatus('FFmpeg.wasm loaded successfully');

    return ffmpeg;
  } catch (error) {
    ffmpegLoading = false;
    console.error('Failed to load FFmpeg.wasm:', error);
    updateStatus('Failed to load FFmpeg.wasm. Falling back to browser-based export.');
    alert('Failed to load FFmpeg.wasm. The export will continue using the browser-based method, which may have synchronization issues.');
    return null;
  }
}

// Export movie using FFmpeg.wasm
async function exportMovieWithFFmpeg(frames, audioBlob, options) {
  const { width, height, fps, duration, filename } = options;

  try {
    // Initialize FFmpeg if not already loaded
    const ffmpegInstance = await initFFmpeg();
    if (!ffmpegInstance) {
      // Fall back to the original export method if FFmpeg failed to load
      return false;
    }

    updateStatus('Preparing frames for FFmpeg processing...');

    // Convert frames to files and write to FFmpeg virtual filesystem
    for (let i = 0; i < frames.length; i++) {
      const frameName = `frame_${i.toString().padStart(5, '0')}.png`;
      const frameBlob = await frames[i];
      const frameData = await fetchFile(frameBlob);
      ffmpeg.FS('writeFile', frameName, frameData);

      // Update progress for frame preparation
      updateExportProgress((i / frames.length) * 50); // First 50% is frame preparation
    }

    // Write audio file to FFmpeg virtual filesystem
    const audioData = await fetchFile(audioBlob);
    ffmpeg.FS('writeFile', 'audio.mp3', audioData);

    updateStatus('Processing video with FFmpeg...');

    // Create video from frames
    await ffmpeg.run(
      '-framerate', fps.toString(),
      '-i', 'frame_%05d.png',
      '-i', 'audio.mp3',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-strict', 'experimental',
      '-shortest',
      '-y',
      'output.mp4'
    );

    // Read the output file
    const data = ffmpeg.FS('readFile', 'output.mp4');

    // Create a blob from the output data
    const outputBlob = new Blob([data.buffer], { type: 'video/mp4' });
    const outputUrl = URL.createObjectURL(outputBlob);

    // Clean up files from the virtual filesystem
    frames.forEach((_, i) => {
      const frameName = `frame_${i.toString().padStart(5, '0')}.png`;
      ffmpeg.FS('unlink', frameName);
    });
    ffmpeg.FS('unlink', 'audio.mp3');
    ffmpeg.FS('unlink', 'output.mp4');

    updateStatus('Export completed successfully!');

    // Show the exported video in a modal for preview
    showExportedVideoPreview(outputUrl, 'mp4');

    // Create download link
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = filename || 'movie.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return true;
  } catch (error) {
    console.error('Error during FFmpeg export:', error);
    updateStatus('Error during FFmpeg export. Falling back to browser-based export.');
    alert('Error during FFmpeg export. The export will continue using the browser-based method, which may have synchronization issues.');
    return false;
  }
}

// Capture frames for FFmpeg processing
async function captureFramesForFFmpeg(canvas, ctx, duration, fps, renderFrameFunction) {
  const frameCount = Math.ceil(duration * fps);
  const frames = [];

  updateStatus(`Capturing ${frameCount} frames for FFmpeg processing...`);

  for (let frameNumber = 0; frameNumber < frameCount; frameNumber++) {
    // Render the current frame
    renderFrameFunction(frameNumber, ctx, canvas);

    // Convert canvas to blob
    const frameBlob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });

    frames.push(frameBlob);

    // Update progress
    updateExportProgress((frameNumber / frameCount) * 100);
  }

  return frames;
}

// Extract audio for FFmpeg processing
async function extractAudioForFFmpeg(audioBuffer, audioContext) {
  updateStatus('Extracting audio for FFmpeg processing...');

  // Create an offline audio context for rendering
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  // Create a buffer source
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  // Render the audio
  const renderedBuffer = await offlineCtx.startRendering();

  // Convert the rendered buffer to WAV
  const wavBlob = await audioBufferToWav(renderedBuffer);

  return wavBlob;
}

// Convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numOfChan * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * numOfChan * bytesPerSample;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + dataSize, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numOfChan, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, byteRate, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitsPerSample, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataSize, true);

  // Write the PCM samples
  const offset = 44;
  let pos = offset;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      // Clamp the value to the 16-bit range
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      // Convert to 16-bit signed integer
      const int = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, int, true);
      pos += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

// Check if FFmpeg.wasm is supported in this browser
function isFFmpegSupported() {
  // Check for SharedArrayBuffer support (required for FFmpeg.wasm)
  if (typeof SharedArrayBuffer === 'undefined') {
    console.warn('SharedArrayBuffer is not supported in this browser. FFmpeg.wasm may not work properly.');

    // Check if we're running in a secure context (HTTPS)
    if (window.isSecureContext) {
      console.log('Running in a secure context, but SharedArrayBuffer is still not available.');
      console.log('This might be due to missing COOP/COEP headers on the server.');
    } else {
      console.log('Not running in a secure context. SharedArrayBuffer requires HTTPS and proper headers.');
    }

    return false;
  }

  // Check for WebAssembly support
  if (typeof WebAssembly === 'undefined') {
    console.warn('WebAssembly is not supported in this browser. FFmpeg.wasm will not work.');
    return false;
  }

  // Check for Cross-Origin Isolation (required for SharedArrayBuffer)
  if (!window.crossOriginIsolated) {
    console.warn('Cross-Origin Isolation is not enabled. FFmpeg.wasm may not work properly.');
    console.log('The page needs to be served with the following HTTP headers:');
    console.log('Cross-Origin-Embedder-Policy: require-corp');
    console.log('Cross-Origin-Opener-Policy: same-origin');
    return false;
  }

  return true;
}
