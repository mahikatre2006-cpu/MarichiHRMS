import React, { useRef, useEffect, useState } from 'react';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_090628_7052d8a6-a094-4341-a4a2-ad58493a67a9.mp4';

export function BoomerangVideoBg() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const framesRef = useRef([]);
  const directionRef = useRef(1); // 1 = forward, -1 = reverse
  const currentIndexRef = useRef(0);
  const animationFrameIdRef = useRef(null);
  const lastDrawTimeRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isCapturing = true;
    let lastRecordedTime = -1;
    let fallbackLoopSet = false;

    // Offscreen canvas for frame resizing
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');

    const captureFrame = () => {
      if (!isCapturing || !video) return;

      const currentTime = video.currentTime;
      if (
        video.readyState >= 2 &&
        currentTime !== lastRecordedTime &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        lastRecordedTime = currentTime;

        const maxW = 960;
        const scale = Math.min(1, maxW / video.videoWidth);
        const targetW = Math.round(video.videoWidth * scale);
        const targetH = Math.round(video.videoHeight * scale);

        if (offscreenCanvas.width !== targetW || offscreenCanvas.height !== targetH) {
          offscreenCanvas.width = targetW;
          offscreenCanvas.height = targetH;
        }

        try {
          offscreenCtx.drawImage(video, 0, 0, targetW, targetH);
          // Store frame as ImageBitmap if supported, else canvas clone
          if (window.createImageBitmap) {
            createImageBitmap(offscreenCanvas).then((bitmap) => {
              if (isCapturing) {
                framesRef.current.push(bitmap);
              }
            }).catch(() => {
              // Fallback: draw directly to cloned canvas
              const frameCanvas = document.createElement('canvas');
              frameCanvas.width = targetW;
              frameCanvas.height = targetH;
              frameCanvas.getContext('2d').drawImage(offscreenCanvas, 0, 0);
              framesRef.current.push(frameCanvas);
            });
          } else {
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = targetW;
            frameCanvas.height = targetH;
            frameCanvas.getContext('2d').drawImage(offscreenCanvas, 0, 0);
            framesRef.current.push(frameCanvas);
          }
        } catch (e) {
          // If crossOrigin taint happens, fall back to native video loop
          if (!fallbackLoopSet) {
            video.loop = true;
            fallbackLoopSet = true;
          }
        }
      }

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        video.requestVideoFrameCallback(captureFrame);
      } else {
        requestAnimationFrame(captureFrame);
      }
    };

    const handlePlay = () => {
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        video.requestVideoFrameCallback(captureFrame);
      } else {
        requestAnimationFrame(captureFrame);
      }
    };

    const handleEnded = () => {
      isCapturing = false;
      if (framesRef.current.length > 5) {
        setIsReady(true);
        startBoomerangPlayback();
      } else {
        // Fallback: restart video with native loop if frames couldn't be captured
        video.loop = true;
        video.play().catch(() => {});
      }
    };

    const handleError = () => {
      isCapturing = false;
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Initial play trigger
    video.play().catch(() => {
      // Autoplay might require user interaction, video remains muted
    });

    return () => {
      isCapturing = false;
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  const startBoomerangPlayback = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const frames = framesRef.current;
    if (!frames.length) return;

    // Set canvas dimensions to match captured frames
    const firstFrame = frames[0];
    canvas.width = firstFrame.width || 960;
    canvas.height = firstFrame.height || 540;

    const targetFps = 30;
    const frameInterval = 1000 / targetFps;

    const loop = (timestamp) => {
      if (!lastDrawTimeRef.current) lastDrawTimeRef.current = timestamp;
      const elapsed = timestamp - lastDrawTimeRef.current;

      if (elapsed >= frameInterval) {
        lastDrawTimeRef.current = timestamp - (elapsed % frameInterval);

        // Ping-pong index calculation
        let nextIndex = currentIndexRef.current + directionRef.current;
        if (nextIndex >= frames.length) {
          directionRef.current = -1;
          nextIndex = Math.max(0, frames.length - 2);
        } else if (nextIndex < 0) {
          directionRef.current = 1;
          nextIndex = Math.min(frames.length - 1, 1);
        }
        currentIndexRef.current = nextIndex;

        const currentFrame = frames[currentIndexRef.current];
        if (currentFrame) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(currentFrame, 0, 0, canvas.width, canvas.height);
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="w-full h-full scale-[1.15] origin-top overflow-hidden">
        {/* Hidden / capture video */}
        <video
          ref={videoRef}
          src={VIDEO_URL}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          className={`w-full h-full object-cover object-top ${
            isReady ? 'hidden' : 'block'
          }`}
        />

        {/* Display Canvas for ping-pong boomerang playback */}
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover object-top ${
            isReady ? 'block' : 'hidden'
          }`}
        />
      </div>
    </div>
  );
}

export default BoomerangVideoBg;
