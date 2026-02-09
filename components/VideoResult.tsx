
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useState, useRef} from 'react';
import {AspectRatio} from '../types';
import {ArrowPathIcon, DownloadIcon, SparklesIcon, FileImageIcon, PlusIcon, MousePointerIcon, CodeIcon} from './icons';
import ScrollPreview from './ScrollPreview';
// @ts-ignore
import gifshot from 'gifshot';

interface VideoResultProps {
  videoUrl: string;
  onRetry: () => void;
  onNewVideo: () => void;
  onExtend: () => void;
  canExtend: boolean;
  aspectRatio: AspectRatio;
}

const VideoResult: React.FC<VideoResultProps> = ({
  videoUrl,
  onRetry,
  onNewVideo,
  onExtend,
  canExtend,
  aspectRatio,
}) => {
  const isPortrait = aspectRatio === AspectRatio.PORTRAIT;
  const [isConvertingGif, setIsConvertingGif] = useState(false);
  const [showScrollPreview, setShowScrollPreview] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDownloadGif = async (frames: number) => {
    if (!videoUrl) return;
    
    setIsConvertingGif(true);
    
    try {
      // Create an off-screen video element to capture frames
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";

      // Wait for metadata to ensure we have duration
      await new Promise((resolve) => {
        if (video.readyState >= 1) {
          resolve(null);
        } else {
          video.onloadedmetadata = () => resolve(null);
        }
      });

      const duration = video.duration;
      const width = isPortrait ? 360 : 640;
      const height = isPortrait ? 640 : 360;
      
      // Calculate time step to cover the full video duration in 'frames' count
      const step = duration / frames;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const images: string[] = [];

      // Extract frames
      for (let i = 0; i < frames; i++) {
        const time = i * step;
        
        // Seek only if necessary (skip for first frame if at 0)
        if (time > 0) {
          video.currentTime = time;
          await new Promise((resolve) => {
             const onSeeked = () => {
               video.removeEventListener('seeked', onSeeked);
               resolve(null);
             };
             video.addEventListener('seeked', onSeeked);
          });
        }
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          images.push(canvas.toDataURL('image/jpeg', 0.8));
        }
      }

      // Generate GIF from extracted images
      gifshot.createGIF({
        images: images,
        interval: 0.1, // 10fps playback
        gifWidth: width,
        gifHeight: height,
        numFrames: frames,
        sampleInterval: 10,
      }, (obj: any) => {
        if (!obj.error) {
          const link = document.createElement('a');
          link.href = obj.image;
          link.download = `veo-studio-creation-${(frames/10).toFixed(1)}s.gif`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          console.error('GIF generation failed:', obj.error);
          alert('Failed to generate GIF. Try again.');
        }
        setIsConvertingGif(false);
      });

    } catch (error) {
      console.error('Error preparing GIF:', error);
      setIsConvertingGif(false);
      alert('An error occurred while preparing the GIF.');
    }
  };

  const getDurationLabel = (divisor: number) => {
    if (!videoDuration) return divisor === 1 ? '8s' : divisor === 2 ? '4s' : '2s';
    return `${Math.round(videoDuration / divisor)}s`;
  };

  // Base frames on 10fps
  const getFrames = (divisor: number) => {
    const duration = videoDuration || 8; // fallback
    return Math.floor((duration / divisor) * 10);
  }

  const handleDownloadHtmlKit = () => {
    // This HTML content is provided by the user in the prompt
    const htmlContent = `<!doctype html><html><head><meta charset=utf-8>
<style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{width:100vw;height:100vh;object-fit:cover;display:block}#overlay{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#fff;font-family:Helvetica,sans-serif;z-index:10;transition:opacity .8s ease}.countdown-text{font-size:12px;letter-spacing:4px;text-transform:uppercase;opacity:.6;margin:0 0 10px}.number{font-size:48px;font-weight:200}</style></head><body><div id=overlay><div class=countdown-text>Experience Loading</div><div id=countdown class=number>10</div></div><canvas id=c>
</canvas><script>(()=>{const
u="veo-creation.mp4"
,F=100,c=document.getElementById("c"),x=c.getContext("2d"),o=document.getElementById("overlay"),n=document.getElementById("countdown"),S=
[],v=document.createElement("video");v.src=u,v.crossOrigin=
"anonymous"
,v.muted=!0,v.preload=
"auto";const R=()=>{c.width=innerWidth,c.height=innerHeight,D(0)},D=p=>{const i=Math.floor(p*
(S.length-1)),m=S[i];if(!m)return;const a=m.width/m.height,b=c.width/c.height;let w,h,X,Y;b>a?
(w=c.width,h=w/a,X=0,Y=(c.height-h)/2):(h=c.height,w=h*a,X=(c.width-
w)/2,Y=0),x.clearRect(0,0,c.width,c.height),x.drawImage(m,X,Y,w,h)};window.onmessage=e=>e.data&&
e.data.type===
"scroll"&&D(e.data.percent);addEventListener("resize"
,R);(async()=>{try{await new
Promise(r=>(v.onloadedmetadata=r,v.load()));const d=v.duration;for(let
i=0;i<F;i++)v.currentTime=d/F*i,await new Promise(r=>{const s=()=>
{v.removeEventListener("seeked"
,s);const
t=document.createElement("canvas");t.width=v.videoWidth,t.height=v.videoHeight,t.getContext("2d")
.drawImage(v,0,0),S.push(t);const g=S.length/F;n.innerText=Math.max(1,Math.ceil(10-
g*9));r()};v.addEventListener("seeked"
,s)});n.innerText=
"READY"
,setTimeout(()=>
{o.style.opacity=
"0"
,setTimeout(()=>o.style.display=
"none"
,800)},500),R()}catch(e)
{n.innerText=
"ERROR"}})();
// Simple scroll listener added for standalone testing
window.addEventListener('scroll', () => {
    const scrollPercent = document.documentElement.scrollTop / (document.documentElement.scrollHeight - document.documentElement.clientHeight);
    D(scrollPercent);
});
// Create a fake scroll height for testing
document.body.style.height = "500vh";
})();</script></body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'index.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Also trigger video download
    const videoLink = document.createElement('a');
    videoLink.href = videoUrl;
    videoLink.download = 'veo-creation.mp4';
    document.body.appendChild(videoLink);
    videoLink.click();
    document.body.removeChild(videoLink);
  };

  return (
    <>
      {showScrollPreview && (
        <ScrollPreview videoUrl={videoUrl} onClose={() => setShowScrollPreview(false)} />
      )}
      
      <div className="w-full relative flex flex-col items-center gap-8 p-12 bg-gray-800/50 rounded-lg border border-gray-700 shadow-2xl overflow-visible">
        {/* New Video Button moved to top-left corner of the card */}
        <button
          onClick={onNewVideo}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-lg shadow-purple-900/20 z-10"
        >
          <PlusIcon className="w-4 h-4" />
          New Video
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-200">
            Your Creation is Ready!
          </h2>
          <p className="text-sm text-gray-400 mt-1 italic">
            High-fidelity cinematic output generated with Veo 3.1
          </p>
        </div>

        <div 
          className={`w-full ${
            isPortrait ? 'max-w-xs aspect-[9/16]' : 'max-w-2xl aspect-video'
          } rounded-lg overflow-hidden bg-black shadow-[0_0_50px_rgba(79,70,229,0.2)] border border-indigo-500/30 transition-all duration-500`}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            loop
            className="w-full h-full object-contain"
            onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
          />
        </div>

        {/* Primary Actions Row */}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all active:scale-95"
            title="Regenerate with same parameters">
            <ArrowPathIcon className="w-5 h-5" />
            Retry
          </button>
          
          <a
            href={videoUrl}
            download="veo-studio-creation.mp4"
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-900/20">
            <DownloadIcon className="w-5 h-5" />
            Download MP4
          </a>

          {/* GIF Download Dropdown */}
          <div className="relative group">
            <button
              disabled={isConvertingGif}
              onClick={() => handleDownloadGif(getFrames(1))}
              className={`flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-all active:scale-95 shadow-lg shadow-amber-900/20 disabled:opacity-50 disabled:cursor-wait`}
            >
              {isConvertingGif ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <FileImageIcon className="w-5 h-5" />
              )}
              {isConvertingGif ? 'Converting...' : 'Download GIF'}
            </button>
            
            {!isConvertingGif && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-visible opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-30
              after:content-[''] after:absolute after:top-full after:left-0 after:w-full after:h-4">
                <div className="overflow-hidden rounded-xl bg-gray-800">
                  <div className="p-3 text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-700 text-center font-bold">
                    Select GIF Duration
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDownloadGif(getFrames(4)); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-amber-600/50 transition-colors flex justify-between items-center group/item"
                  >
                    <span>{getDurationLabel(4)}</span>
                    <span className="text-[10px] text-gray-500 group-hover/item:text-white">4x Speed</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDownloadGif(getFrames(2)); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-amber-600/50 transition-colors flex justify-between items-center group/item"
                  >
                    <span>{getDurationLabel(2)}</span>
                    <span className="text-[10px] text-gray-500 group-hover/item:text-white">2x Speed</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDownloadGif(getFrames(1)); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-amber-600/50 transition-colors flex justify-between items-center group/item"
                  >
                    <span>{getDurationLabel(1)}</span>
                    <span className="text-[10px] text-gray-500 group-hover/item:text-white">Normal</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {canExtend ? (
            <button
              onClick={onExtend}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
              title="Extend this video by 7 seconds">
              <SparklesIcon className="w-5 h-5" />
              Extend
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-2 px-6 py-3 bg-gray-700/50 text-gray-500 font-semibold rounded-lg cursor-not-allowed opacity-60 border border-gray-700"
              title="1080p/4k videos can't be extended">
              <SparklesIcon className="w-5 h-5" />
              Extend
            </button>
          )}
        </div>

        {/* Scroll Animation Features */}
        <div className="w-full pt-6 border-t border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-300">Web Scroll Animation Kit</h3>
            <p className="text-xs text-gray-500">Preview and download the HTML to use this video as a scroll-based animation.</p>
          </div>
          <div className="flex gap-3">
             <button
              onClick={() => setShowScrollPreview(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <MousePointerIcon className="w-4 h-4" />
              Preview Scroll
            </button>
            <button
              onClick={handleDownloadHtmlKit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-sm font-medium rounded-lg transition-colors"
            >
              <CodeIcon className="w-4 h-4" />
              Download HTML Kit
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoResult;
