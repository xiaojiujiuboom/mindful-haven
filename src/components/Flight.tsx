import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Companion {
  x: number; y: number; vx: number; vy: number;
  scale: number; wingSpeed: number; wingAmp: number; facing: number;
  bw: number; bh: number; hs: number;
}

export default function Flight({ onBack, onComplete }: { onBack: () => void; onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetPosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [handState, setHandState] = useState<{x: number, y: number} | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [introText, setIntroText] = useState('');
  const colorRef = useRef(0); // 0=grayscale, 1=color
  const sceneImgRef = useRef<HTMLImageElement | null>(null);
  const sceneAlpha = useRef(0);
  const sceneTarget = useRef(0);
  const sceneImagesRef = useRef<HTMLImageElement[]>([]);
  const sceneIdxRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // UI auto-hide
  useEffect(() => {
    let t: any;
    const h = () => { setShowUI(true); clearTimeout(t); t = setTimeout(() => setShowUI(false), 4000); };
    window.addEventListener('mousemove', h);
    window.addEventListener('touchstart', h);
    t = setTimeout(() => setShowUI(false), 4000);
    return () => { window.removeEventListener('mousemove', h); window.removeEventListener('touchstart', h); clearTimeout(t); };
  }, []);

  // Mouse/touch
  useEffect(() => {
    const mm = (e: MouseEvent) => { if (!handState) targetPosRef.current = { x: e.clientX, y: e.clientY }; };
    const tm = (e: TouchEvent) => { if (!handState && e.touches.length) targetPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    window.addEventListener('mousemove', mm);
    window.addEventListener('touchmove', tm, { passive: false });
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('touchmove', tm); };
  }, [handState]);

  // Intro
  useEffect(() => {
    let m = true;
    const w = (ms: number) => new Promise(r => setTimeout(r, ms));
    (async () => {
      setIntroText("close your eyes for a moment...");
      await w(3000); if (!m) return;
      setIntroText("now open them.");
      await w(2500); if (!m) return;
      setIntroText("guide the bird with your hand.");
      await w(3000); if (!m) return;
      setIntroText(''); setIntroComplete(true);
    })();
    return () => { m = false; };
  }, []);

  // MediaPipe
  useEffect(() => {
    let camera: any;
    const init = async () => {
      if (!window.Hands || !window.Camera) { setTimeout(init, 500); return; }
      const hands = new window.Hands({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
      hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      hands.onResults((r: any) => {
        if (r.multiHandLandmarks?.length) {
          const lm = r.multiHandLandmarks[0];
          const x = (1 - lm[9].x) * window.innerWidth, y = lm[9].y * window.innerHeight;
          targetPosRef.current = { x, y }; setHandState({ x, y });
        } else setHandState(null);
      });
      let proc = false;
      if (videoRef.current) {
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => { if (proc || !videoRef.current) return; proc = true; try { await hands.send({ image: videoRef.current }); } catch(e) {} finally { proc = false; } },
          width: 640, height: 480
        });
        camera.start().then(() => setIsReady(true)).catch(console.error);
      }
    };
    init();
    return () => { if (camera) camera.stop(); };
  }, []);

  // Load all scene images
  useEffect(() => {
    const scenePaths = ['/scenes/shamo.png', '/scenes/dahai.png', '/scenes/cunzhuang.png', '/scenes/xingkong.png'];
    const startIdx = Math.floor(Math.random() * scenePaths.length);
    sceneIdxRef.current = startIdx;
    scenePaths.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        sceneImagesRef.current[i] = img;
        if (i === startIdx) sceneImgRef.current = img;
      };
    });
  }, []);

  // Color transition + scene trigger + scene cycling
  useEffect(() => {
    if (!introComplete) return;
    const start = Date.now();
    const iv = setInterval(() => { colorRef.current = Math.min(1, (Date.now() - start) / 15000); }, 50);
    // First scene appears after 15s
    const st = setTimeout(() => { sceneTarget.current = 1; }, 15000);
    // Cycle scenes: every 15s after first scene
    let cycleInterval: ReturnType<typeof setInterval>;
    const cycleStart = setTimeout(() => {
      cycleInterval = setInterval(() => {
        // Fade out current scene
        sceneTarget.current = 0;
        // After 2s (scene nearly faded), swap image and fade in
        setTimeout(() => {
          const images = sceneImagesRef.current;
          if (images.length > 0) {
            sceneIdxRef.current = (sceneIdxRef.current + 1) % images.length;
            if (images[sceneIdxRef.current]) {
              sceneImgRef.current = images[sceneIdxRef.current];
            }
          }
          sceneTarget.current = 1;
        }, 2000);
      }, 15000);
    }, 30000);
    return () => { clearInterval(iv); clearTimeout(st); clearTimeout(cycleStart); if (cycleInterval) clearInterval(cycleInterval); };
  }, [introComplete]);

  // Bird chirps
  useEffect(() => {
    if (!introComplete) return;
    const chirp = () => {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine';
      const f = 2000 + Math.random() * 2000;
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, ctx.currentTime + 0.05);
      osc.frequency.exponentialRampToValueAtTime(f * 0.7, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    };
    const iv = setInterval(() => { if (Math.random() < 0.3) chirp(); }, 6000);
    return () => clearInterval(iv);
  }, [introComplete]);

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;
    let bX = window.innerWidth / 2, bY = window.innerHeight / 2, bVX = 0, bVY = 0;

    const companions: Companion[] = [
      { x: Math.random() * window.innerWidth, y: 80 + Math.random() * 150, vx: 1.2, vy: 0.3, scale: 0.55, wingSpeed: 0.009, wingAmp: 12, facing: 1, bw: 13, bh: 11, hs: 9 },
      { x: Math.random() * window.innerWidth, y: 200 + Math.random() * 100, vx: -0.9, vy: -0.15, scale: 0.4, wingSpeed: 0.012, wingAmp: 10, facing: -1, bw: 11, bh: 9, hs: 8 },
      { x: Math.random() * window.innerWidth, y: 50 + Math.random() * 80, vx: 0.7, vy: 0.1, scale: 0.3, wingSpeed: 0.008, wingAmp: 8, facing: 1, bw: 9, bh: 7, hs: 6 },
    ];
    const clouds = Array.from({ length: 15 }).map(() => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight * 0.7,
      size: Math.random() * 80 + 40, scale: Math.random() * 0.8 + 0.5,
      speed: Math.random() * 0.5 + 0.2, opacity: Math.random() * 0.3 + 0.15,
    }));

    const drawBird = (x: number, y: number, sc: number, face: number, bw: number, bh: number, hs: number, wf: number) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(sc * face, sc);
      ctx.strokeStyle = '#171717'; ctx.fillStyle = 'white'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // Tail
      ctx.beginPath(); ctx.moveTo(-bw * 0.8, 2); ctx.lineTo(-bw * 1.6, -5); ctx.lineTo(-bw * 1.3, 4); ctx.lineTo(-bw * 1.7, 7); ctx.lineTo(-bw * 0.9, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      // Far wing (shorter)
      ctx.beginPath(); ctx.moveTo(-2, -3); ctx.quadraticCurveTo(-5, -16 + wf, -bw * 0.9, -20 + wf); ctx.quadraticCurveTo(-bw * 0.4, -10 + wf * 0.5, 0, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
      // Body
      ctx.beginPath(); ctx.ellipse(0, 2, bw, bh, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Head
      ctx.beginPath(); ctx.arc(bw * 0.6, -bh * 0.5, hs, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Eye
      ctx.beginPath(); ctx.arc(bw * 0.8, -bh * 0.65, hs * 0.25, 0, Math.PI * 2); ctx.fillStyle = '#171717'; ctx.fill();
      ctx.beginPath(); ctx.arc(bw * 0.88, -bh * 0.75, hs * 0.1, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill();
      // Beak
      ctx.beginPath(); ctx.moveTo(bw * 0.6 + hs, -bh * 0.5); ctx.lineTo(bw * 0.6 + hs + 5, -bh * 0.55); ctx.lineTo(bw * 0.6 + hs, -bh * 0.35); ctx.closePath(); ctx.fillStyle = '#fbbf24'; ctx.fill(); ctx.strokeStyle = '#171717'; ctx.stroke();
      // Blush
      ctx.beginPath(); ctx.ellipse(bw * 0.85, -bh * 0.15, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(251,191,36,0.2)'; ctx.fill();
      // Near wing (shorter)
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(-5, 18 - wf, -bw * 0.9, 22 - wf); ctx.quadraticCurveTo(-bw * 0.4, 12 - wf * 0.5, 2, 6); ctx.closePath(); ctx.fillStyle = 'white'; ctx.fill(); ctx.strokeStyle = '#171717'; ctx.stroke();
      ctx.restore();
    };

    const render = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      canvas.style.filter = `grayscale(${1 - colorRef.current})`;
      ctx.fillStyle = '#e5e5e5'; ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Scene crossfade (smooth interpolation)
      sceneAlpha.current += (sceneTarget.current - sceneAlpha.current) * 0.025;
      if (sceneImgRef.current && sceneAlpha.current > 0.005) {
        ctx.globalAlpha = sceneAlpha.current;
        const img = sceneImgRef.current;
        const ia = img.width / img.height, ca = canvas.width / canvas.height;
        let dw: number, dh: number, dx: number, dy: number;
        if (ca > ia) { dw = canvas.width; dh = dw / ia; dx = 0; dy = (canvas.height - dh) / 2; }
        else { dh = canvas.height; dw = dh * ia; dx = (canvas.width - dw) / 2; dy = 0; }
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      }

      // Clouds (fade out as scene fades in)
      const cloudAlpha = 1 - sceneAlpha.current;
      if (cloudAlpha > 0.05) {
        clouds.forEach(c => {
          c.x -= c.speed; if (c.x + c.size * 2 < 0) { c.x = canvas.width + c.size * 2; c.y = Math.random() * canvas.height * 0.7; }
          ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.scale, c.scale); ctx.globalAlpha = c.opacity * cloudAlpha;
          ctx.strokeStyle = '#a1a1aa'; ctx.fillStyle = '#d4d4d8'; ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI, 0); ctx.arc(25, 0, 15, Math.PI, 0); ctx.arc(-20, 0, 12, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.globalAlpha = 1; ctx.restore();
        });
      }

      // Bird physics
      bVX += (targetPosRef.current.x - bX) * 0.002; bVY += (targetPosRef.current.y - bY) * 0.002;
      bVX *= 0.92; bVY *= 0.92; bX += bVX; bY += bVY;

      // Companion birds
      companions.forEach(b => {
        b.x += b.vx; b.y += b.vy + Math.sin(Date.now() * 0.0008 + b.x * 0.01) * 0.4;
        if (b.x > canvas.width + 60) b.x = -60;
        if (b.x < -60) b.x = canvas.width + 60;
        if (b.y > canvas.height * 0.75) b.vy = -Math.abs(b.vy);
        if (b.y < 30) b.vy = Math.abs(b.vy);
        drawBird(b.x, b.y, b.scale, b.facing, b.bw, b.bh, b.hs, Math.sin(Date.now() * b.wingSpeed) * b.wingAmp);
      });

      // Main bird
      ctx.save(); ctx.translate(bX, bY);
      ctx.rotate(Math.max(-Math.PI / 4, Math.min(Math.PI / 4, bVY * 0.05)));
      drawBird(0, 0, 1.3, bVX < -0.5 ? -1 : 1, 16, 14, 13, Math.sin(Date.now() * 0.007) * 14);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden select-none bg-[#e5e5e5]">
      <style dangerouslySetInnerHTML={{__html: `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap'); .font-sketch { font-family: 'Caveat', cursive; }`}} />
      <video ref={videoRef} className="absolute w-1 h-1 opacity-0 pointer-events-none" style={{top: -9999, left: -9999}} playsInline muted />

      <AnimatePresence>
        {showUI && introComplete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <button onClick={onBack} className="absolute top-8 left-8 z-50 p-3 text-[#171717] hover:bg-[#171717] hover:text-[#e5e5e5] rounded-full transition-colors border-[3px] border-transparent hover:border-[#171717]">
              <ArrowLeft size={28} strokeWidth={2.5} />
            </button>
            <div className="absolute top-8 right-8 z-20">
              {!isReady && (
                <div className="flex flex-col items-center justify-center bg-white border-[3px] border-[#171717] shadow-[4px_4px_0px_#171717] rounded-xl text-[#171717] font-sketch text-lg text-center p-3">
                  <Camera className="animate-pulse mb-1" size={20} strokeWidth={2.5} /><span>starting camera...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {handState && (
        <div className="absolute z-50 rounded-full pointer-events-none w-8 h-8 bg-transparent border-[3px] border-[#171717] transition-all duration-75"
          style={{ left: handState.x - 16, top: handState.y - 16 }} />
      )}

      <canvas ref={canvasRef} className="block w-full h-full cursor-none" />

      {!introComplete && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#e5e5e5]">
          <AnimatePresence mode="wait">
            {introText && (
              <motion.p key={introText} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="text-4xl md:text-5xl font-sketch font-bold text-[#171717] text-center max-w-2xl px-6 leading-relaxed">
                {introText}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
