/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState } from 'react';
import { XMarkIcon } from './icons';

interface ScrollPreviewProps {
  videoUrl: string;
  onClose: () => void;
}

const ScrollPreview: React.FC<ScrollPreviewProps> = ({ videoUrl, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const FRAME_COUNT = 100;

  useEffect(() => {
    let isActive = true;
    const canvas = canvasRef.current;
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';

    const extractFrames = async () => {
      try {
        await new Promise((resolve) => {
          video.onloadedmetadata = resolve;
          video.load();
        });

        const duration = video.duration;
        const width = video.videoWidth;
        const height = video.videoHeight;

        // Set initial canvas size
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }

        // Extract frames
        for (let i = 0; i < FRAME_COUNT; i++) {
          if (!isActive) return;
          
          video.currentTime = (duration / FRAME_COUNT) * i;
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              
              // Draw to temporary canvas for storage
              const frameCanvas = document.createElement('canvas');
              frameCanvas.width = width;
              frameCanvas.height = height;
              frameCanvas.getContext('2d')?.drawImage(video, 0, 0);
              framesRef.current.push(frameCanvas);
              
              setLoadingProgress(Math.floor((i / FRAME_COUNT) * 100));
              resolve();
            };
            video.addEventListener('seeked', onSeeked);
          });
        }
        
        setIsReady(true);
      } catch (e) {
        console.error("Frame extraction failed", e);
      }
    };

    extractFrames();

    return () => {
      isActive = false;
    };
  }, [videoUrl]);

  // Handle drawing based on scroll
  useEffect(() => {
    if (!isReady) return;

    const handleScroll = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const scrollPercent = Math.max(0, Math.min(1, scrollTop / scrollHeight));

      const frameIndex = Math.floor(scrollPercent * (framesRef.current.length - 1));
      const frame = framesRef.current[frameIndex];

      if (frame) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Cover logic
          const frameAspect = frame.width / frame.height;
          const canvasAspect = canvas.width / canvas.height;
          
          let drawWidth, drawHeight, offsetX, offsetY;

          if (canvasAspect > frameAspect) {
             drawWidth = canvas.width;
             drawHeight = canvas.width / frameAspect;
             offsetX = 0;
             offsetY = (canvas.height - drawHeight) / 2;
          } else {
             drawHeight = canvas.height;
             drawWidth = canvas.height * frameAspect;
             offsetX = (canvas.width - drawWidth) / 2;
             offsetY = 0;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(frame, offsetX, offsetY, drawWidth, drawHeight);
        }
      }
    };

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        handleScroll(); // Redraw
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    window.addEventListener('resize', handleResize);

    // Initial draw
    handleScroll();

    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isReady]);

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Scroll container that mimics a long page */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div style={{ height: '500vh' }}>
          {/* Invisible spacer to create scroll length */}
        </div>
      </div>

      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-full pointer-events-none"
      />

      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-[110] bg-white/10 hover:bg-white/20 backdrop-blur-md p-2 rounded-full text-white transition-colors"
      >
        <XMarkIcon className="w-8 h-8" />
      </button>

      {/* Loading Overlay */}
      <div 
        className={`fixed inset-0 flex flex-col items-center justify-center bg-black text-white font-sans transition-opacity duration-1000 z-[105] pointer-events-none ${isReady ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="text-xs tracking-[4px] uppercase opacity-60 mb-2">Experience Loading</div>
        <div className="text-5xl font-thin">{loadingProgress}%</div>
      </div>
      
      {/* Scroll Hint */}
      {isReady && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 text-white/50 animate-bounce pointer-events-none z-[105]">
           Scroll Down
        </div>
      )}
    </div>
  );
};

export default ScrollPreview;