import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ZenGarden({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showUI, setShowUI] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const lastPosRef = useRef<{x: number, y: number} | null>(null);

  // UI fade out logic
  useEffect(() => {
    let timeout: any;
    const handleActivity = () => {
      setShowUI(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowUI(false), 4000);
    };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    timeout = setTimeout(() => setShowUI(false), 4000);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearTimeout(timeout);
    };
  }, []);

  // Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize sand background
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = '#d4c5b9'; // Sand color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some noise to sand
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      imageData.data[i] += noise;
      imageData.data[i+1] += noise;
      imageData.data[i+2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);

    let animationId: number;
    const render = () => {
      // Fade effect (wind blowing sand)
      ctx.fillStyle = 'rgba(212, 197, 185, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      animationId = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(animationId);
  }, []);

  // Hand tracking
  useEffect(() => {
    let camera: any;
    const initMediaPipe = async () => {
      if (!window.Hands || !window.Camera) {
        setTimeout(initMediaPipe, 500);
        return;
      }
      const hands = new window.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      hands.onResults((results: any) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          // Use index finger tip
          const x = (1 - landmarks[8].x) * window.innerWidth;
          const y = landmarks[8].y * window.innerHeight;
          
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (ctx && lastPosRef.current) {
            // Draw rake lines
            ctx.beginPath();
            ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
            ctx.lineTo(x, y);
            ctx.strokeStyle = 'rgba(180, 160, 140, 0.5)'; // Darker sand shadow
            ctx.lineWidth = 20;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Add shadow for depth
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            ctx.stroke();
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
          }
          lastPosRef.current = { x, y };
        } else {
          lastPosRef.current = null;
        }
      });

      if (videoRef.current) {
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) await hands.send({ image: videoRef.current });
          },
          width: 640, height: 480
        });
        camera.start().then(() => setIsReady(true)).catch(console.error);
      }
    };
    initMediaPipe();
    return () => { if (camera) camera.stop(); };
  }, []);

  // Mouse fallback
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDrawing = false;

    const startDraw = (e: MouseEvent | TouchEvent) => {
      isDrawing = true;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      lastPosRef.current = { x, y };
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || !lastPosRef.current) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;

      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(180, 160, 140, 0.5)';
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.stroke();
      ctx.shadowColor = 'transparent';

      lastPosRef.current = { x, y };
    };

    const stopDraw = () => {
      isDrawing = false;
      lastPosRef.current = null;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);

    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('mouseleave', stopDraw);
      
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 cursor-crosshair" />
      
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <button 
              onClick={onBack}
              className="absolute top-8 left-8 z-50 p-3 text-black/50 hover:text-black transition-colors"
            >
              <ArrowLeft size={24} strokeWidth={1.5} />
            </button>
            
            <div className="absolute top-16 w-full text-center pointer-events-none">
              <h2 className="text-3xl font-serif text-black/70 tracking-widest mb-2">Zen Garden</h2>
              <p className="text-black/40 text-sm font-light tracking-wider">Draw in the sand, watch it fade</p>
            </div>

            <div className="absolute top-8 right-8 w-24 h-16 bg-black/10 rounded-lg overflow-hidden border border-black/10 z-20">
              <video ref={videoRef} className="w-full h-full object-cover transform -scale-x-100 opacity-50" playsInline muted />
              {!isReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 text-black/70 text-[10px] text-center p-1">
                  <Camera className="animate-pulse mb-1" size={12} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
