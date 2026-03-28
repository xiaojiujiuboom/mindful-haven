import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

interface Stone {
  id: string;
  x: number;
  y: number;
  text: string;
  state: 'pile' | 'writing' | 'charging' | 'ready_to_throw' | 'flying' | 'sinking';
  chargeProgress: number;
  scale: number;
}

export default function Pond({ onBack, onComplete }: { onBack: () => void; onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showUI, setShowUI] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [introText, setIntroText] = useState('');
  const [throwFeedback, setThrowFeedback] = useState('');

  const worryOptions = [
    { label: 'stress', emoji: '~' },
    { label: 'anxiety', emoji: '~' },
    { label: 'sadness', emoji: '~' },
    { label: 'anger', emoji: '~' },
    { label: 'fear', emoji: '~' },
    { label: 'regret', emoji: '~' },
  ];
  
  const [stones, setStones] = useState<Stone[]>([
    { id: '1', x: 0, y: 0, text: '', state: 'pile', chargeProgress: 0, scale: 1 },
    { id: '2', x: 0, y: 0, text: '', state: 'pile', chargeProgress: 0, scale: 1 },
    { id: '3', x: 0, y: 0, text: '', state: 'pile', chargeProgress: 0, scale: 1 },
    { id: '4', x: 0, y: 0, text: '', state: 'pile', chargeProgress: 0, scale: 1 },
    { id: '5', x: 0, y: 0, text: '', state: 'pile', chargeProgress: 0, scale: 1 },
    { id: '6', x: 0, y: 0, text: '', state: 'pile', chargeProgress: 0, scale: 1 },
  ]);
  const [activeStoneId, setActiveStoneId] = useState<string | null>(null);
  
  const [handState, setHandState] = useState<{x: number, y: number, isPinching: boolean, velocity: number} | null>(null);
  
  const ripplesRef = useRef<Ripple[]>([]);
  const stonesRef = useRef<Stone[]>(stones);
  const activeStoneIdRef = useRef<string | null>(activeStoneId);
  const pinchStartRef = useRef<number>(0);
  const lastHandPosRef = useRef<{x: number, y: number, time: number} | null>(null);

  useEffect(() => { stonesRef.current = stones; }, [stones]);
  useEffect(() => { activeStoneIdRef.current = activeStoneId; }, [activeStoneId]);

  // Intro sequence
  useEffect(() => {
    let isMounted = true;
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const runIntro = async () => {
      setIntroText("some worries are like stones...");
      await wait(3000);
      if (!isMounted) return;
      setIntroText("heavy, but you can let them go.");
      await wait(3000);
      if (!isMounted) return;
      setIntroText("pick one up and throw it away.");
      await wait(3000);
      if (!isMounted) return;
      setIntroText('');
      setIntroComplete(true);
    };
    runIntro();
    return () => { isMounted = false; };
  }, []);

  // UI fade out
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
        const now = performance.now();
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          
          const x = (1 - indexTip.x) * window.innerWidth;
          const y = indexTip.y * window.innerHeight;
          
          const dx = thumbTip.x - indexTip.x;
          const dy = thumbTip.y - indexTip.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const isPinching = distance < 0.08;
          
          let velocity = 0;
          if (lastHandPosRef.current) {
            const dt = now - lastHandPosRef.current.time;
            if (dt > 0) {
              const dx = x - lastHandPosRef.current.x;
              const dy = y - lastHandPosRef.current.y;
              velocity = Math.sqrt(dx * dx + dy * dy) / dt;
            }
          }
          lastHandPosRef.current = { x, y, time: now };
          
          setHandState({ x, y, isPinching, velocity });

          // Interaction Logic
          const activeId = activeStoneIdRef.current;
          if (activeId) {
            const currentStones = [...stonesRef.current];
            const stoneIndex = currentStones.findIndex(s => s.id === activeId);
            if (stoneIndex !== -1) {
              const stone = currentStones[stoneIndex];
              
              if (stone.state === 'charging' || stone.state === 'ready_to_throw') {
                if (isPinching) {
                  if (pinchStartRef.current === 0) pinchStartRef.current = now;
                  const chargeDuration = now - pinchStartRef.current;
                  const progress = Math.min(chargeDuration / 2000, 1); // 2 seconds to charge
                  
                  currentStones[stoneIndex] = { 
                    ...stone, 
                    chargeProgress: progress,
                    state: progress >= 1 ? 'ready_to_throw' : 'charging',
                    x, y // Follow hand
                  };
                  setStones(currentStones);
                } else {
                  // Released
                  if (stone.state === 'ready_to_throw' && velocity > 1.5) {
                    // Throw!
                    currentStones[stoneIndex] = { ...stone, state: 'flying', x, y };
                    setStones(currentStones);
                    setActiveStoneId(null); // Deselect
                    onComplete?.();
                  } else {
                    // Reset charge if released early or not thrown hard enough
                    currentStones[stoneIndex] = { ...stone, chargeProgress: 0, state: 'charging', x: window.innerWidth/2, y: window.innerHeight/2 };
                    setStones(currentStones);
                  }
                  pinchStartRef.current = 0;
                }
              }
            }
          }
        } else {
          setHandState(null);
          lastHandPosRef.current = null;
          pinchStartRef.current = 0;
          
          const activeId = activeStoneIdRef.current;
          if (activeId) {
            const currentStones = [...stonesRef.current];
            const stoneIndex = currentStones.findIndex(s => s.id === activeId);
            if (stoneIndex !== -1 && currentStones[stoneIndex].state === 'ready_to_throw') {
              currentStones[stoneIndex] = { ...currentStones[stoneIndex], chargeProgress: 0, state: 'charging', x: window.innerWidth/2, y: window.innerHeight/2 };
              setStones(currentStones);
            }
          }
        }
      });

      let isProcessing = false;
      if (videoRef.current) {
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (isProcessing || !videoRef.current) return;
            isProcessing = true;
            try {
              await hands.send({ image: videoRef.current });
            } catch (e) {
              console.error('MediaPipe send error:', e);
            } finally {
              isProcessing = false;
            }
          },
          width: 640, height: 480
        });
        camera.start().then(() => setIsReady(true)).catch(console.error);
      }
    };
    initMediaPipe();
    return () => { if (camera) camera.stop(); };
  }, []);

  // Canvas Water Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      ctx.fillStyle = '#e5e5e5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw lake horizon and shore
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.6);
      for (let i = 0; i <= canvas.width + 50; i += 50) {
        ctx.lineTo(i, canvas.height * 0.6 + Math.sin(i * 0.01) * 20);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fillStyle = '#d4d4d8'; // Grass area
      ctx.fill();
      ctx.strokeStyle = '#171717';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw some grass blades
      ctx.strokeStyle = '#171717';
      ctx.lineWidth = 2;
      for (let i = 0; i < 30; i++) {
        const gx = (i * 137) % canvas.width;
        const gy = canvas.height * 0.65 + ((i * 347) % (canvas.height * 0.3));
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx - 5, gy - 10, gx - 10, gy - 15);
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + 5, gy - 12, gx + 8, gy - 18);
        ctx.stroke();
      }

      // Draw some lake waves
      ctx.strokeStyle = 'rgba(23, 23, 23, 0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 20; i++) {
        const wx = (i * 211) % canvas.width;
        const wy = canvas.height * 0.1 + ((i * 173) % (canvas.height * 0.4));
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.quadraticCurveTo(wx + 20, wy - 5, wx + 40, wy);
        ctx.quadraticCurveTo(wx + 60, wy + 5, wx + 80, wy);
        ctx.stroke();
      }

      // Draw Ripples (Sketch style) - clipped to water area only
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(canvas.width, 0);
      ctx.lineTo(canvas.width, canvas.height * 0.6);
      for (let i = canvas.width; i >= 0; i -= 50) {
        ctx.lineTo(i, canvas.height * 0.6 + Math.sin(i * 0.01) * 20);
      }
      ctx.lineTo(0, canvas.height * 0.6);
      ctx.closePath();
      ctx.clip();

      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const r = ripplesRef.current[i];
        r.radius += r.speed;
        r.alpha -= r.speed / r.maxRadius;

        if (r.alpha <= 0) {
          ripplesRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(23, 23, 23, ${r.alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Inner ripple
        if (r.radius > 20) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius - 20, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(23, 23, 23, ${r.alpha * 0.5})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      ctx.restore(); // End water clip

      // Update flying stones
      const currentStones = [...stonesRef.current];
      let stonesUpdated = false;
      
      currentStones.forEach((stone, idx) => {
        if (stone.state === 'flying') {
          // Move towards center
          const targetX = canvas.width / 2;
          const targetY = canvas.height / 2 - 100;
          stone.x += (targetX - stone.x) * 0.1;
          stone.y += (targetY - stone.y) * 0.1;
          stone.scale *= 0.95; // Shrink as it flies away

          const dist = Math.sqrt(Math.pow(targetX - stone.x, 2) + Math.pow(targetY - stone.y, 2));
          if (dist < 20) {
            stone.state = 'sinking';
            playSplash();
            const feedbacks = [
              "your worry sinks to the bottom...",
              "released. let it go.",
              "the water carries it away.",
              "gone. you are lighter now.",
              "it dissolves into nothing.",
            ];
            setThrowFeedback(feedbacks[Math.floor(Math.random() * feedbacks.length)]);
            setTimeout(() => setThrowFeedback(''), 4000);
            ripplesRef.current.push({
              x: targetX, y: targetY,
              radius: 10, maxRadius: 300,
              alpha: 1, speed: 4
            });
          }
          stonesUpdated = true;
        } else if (stone.state === 'sinking') {
          stone.scale *= 0.9;
          stone.y += 2;
          if (stone.scale < 0.01) {
            // Respawn stone in pile
            currentStones[idx] = { id: Math.random().toString(), x: 0, y: 0, text: '', state: 'pile', chargeProgress: 0, scale: 1 };
          }
          stonesUpdated = true;
        }
      });
      
      if (stonesUpdated) setStones(currentStones);

      animationId = requestAnimationFrame(render);
    };
    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleStoneClick = (id: string) => {
    setActiveStoneId(id);
    const currentStones = [...stones];
    const idx = currentStones.findIndex(s => s.id === id);
    if (idx !== -1) {
      currentStones[idx].state = 'writing';
      setStones(currentStones);
    }
  };

  const handleWorrySelect = (worry: string) => {
    if (activeStoneId) {
      const currentStones = [...stones];
      const idx = currentStones.findIndex(s => s.id === activeStoneId);
      if (idx !== -1) {
        currentStones[idx].text = worry;
        currentStones[idx].state = 'charging';
        currentStones[idx].x = window.innerWidth / 2;
        currentStones[idx].y = window.innerHeight / 2;
        setStones(currentStones);
      }
    }
  };

  // Splash sound
  const playSplash = () => {
    try {
      const ctx = new AudioContext();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
      const g = ctx.createGain(); g.gain.value = 0.25;
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
    } catch(e) {}
  };

  return (
    <div className="relative w-full h-screen bg-[#e5e5e5] overflow-hidden select-none">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
        .font-sketch {
          font-family: 'Caveat', cursive;
        }
      `}} />
      <video ref={videoRef} className="absolute w-1 h-1 opacity-0 pointer-events-none" style={{top: -9999, left: -9999}} playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0" />
      
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
              className="absolute top-8 left-8 z-50 p-3 text-[#171717] hover:bg-[#171717] hover:text-[#e5e5e5] rounded-full transition-colors border-[3px] border-transparent hover:border-[#171717]"
            >
              <ArrowLeft size={28} strokeWidth={2.5} />
            </button>

            <div className="absolute top-8 right-8 z-20">
              {!isReady && (
                <div className="flex flex-col items-center justify-center bg-white border-[3px] border-[#171717] shadow-[4px_4px_0px_#171717] rounded-xl text-[#171717] font-sketch text-lg text-center p-3">
                  <Camera className="animate-pulse mb-1" size={20} strokeWidth={2.5} />
                  <span>starting camera...</span>
                </div>
              )}
            </div>
            
            <div className="absolute top-16 w-full text-center pointer-events-none z-20">
              <h2 className="text-5xl font-sketch font-bold text-[#171717] tracking-wider mb-2">whispers</h2>
              <p className="text-[#71717a] text-3xl font-sketch tracking-wider">
                {!activeStoneId && "pick a stone from the pile"}
                {activeStoneId && stones.find(s => s.id === activeStoneId)?.state === 'writing' && "choose what weighs on you..."}
                {activeStoneId && stones.find(s => s.id === activeStoneId)?.state === 'charging' && "hold it tight... pinch to charge"}
                {activeStoneId && stones.find(s => s.id === activeStoneId)?.state === 'ready_to_throw' && "now throw it away — let go."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hand Indicator */}
      {handState && (
        <div
          className={`absolute z-50 rounded-full pointer-events-none transition-all duration-75 border-[3px] flex items-center justify-center ${
            handState.isPinching ? 'w-6 h-6 bg-[#171717] border-[#171717] scale-75' : 'w-10 h-10 bg-transparent border-[#171717] scale-100'
          }`}
          style={{ left: handState.x - (handState.isPinching ? 12 : 20), top: handState.y - (handState.isPinching ? 12 : 20) }}
        />
      )}

      {/* Stone Pile */}
      {!activeStoneId && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[500px] h-48 z-30">
          {stones.filter(s => s.state === 'pile').map((stone, idx) => {
            // Spread stones out in a wider area with more separation
            const positions = [
              { x: -150, y: -10, rot: -20 },
              { x: -60, y: -25, rot: 15 },
              { x: 40, y: -5, rot: -10 },
              { x: 130, y: -20, rot: 25 },
              { x: -100, y: 30, rot: 10 },
              { x: 80, y: 35, rot: -15 },
            ];
            const pos = positions[idx] || { x: idx * 80 - 160, y: 0, rot: 0 };

            return (
              <button
                key={stone.id}
                onClick={() => handleStoneClick(stone.id)}
                className="absolute w-20 h-16 md:w-24 md:h-20 bg-[#a1a1aa] border-[4px] border-[#171717] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] shadow-[6px_6px_0px_#71717a] hover:shadow-none hover:translate-y-[6px] hover:translate-x-[6px] flex items-center justify-center transition-all group"
                style={{
                  left: `calc(50% + ${pos.x}px)`,
                  top: `calc(50% + ${pos.y}px)`,
                  transform: `translate(-50%, -50%) rotate(${pos.rot}deg)`,
                  zIndex: 10 + idx
                }}
              >
                <span className="text-[#171717] font-sketch text-lg opacity-0 group-hover:opacity-100 transition-opacity">pick</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emotion Selection (replaces text writing) */}
      {activeStoneId && stones.find(s => s.id === activeStoneId)?.state === 'writing' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#e5e5e5]/90 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-8"
          >
            <h2 className="text-4xl md:text-5xl font-sketch font-bold text-[#171717] text-center">
              what weighs on you?
            </h2>
            <div className="flex flex-wrap justify-center gap-4 max-w-xl">
              {worryOptions.map(w => (
                <button
                  key={w.label}
                  onClick={() => handleWorrySelect(w.label)}
                  className="px-8 py-4 bg-[#a1a1aa] text-white border-[4px] border-[#171717] rounded-[40%_60%_50%_50%/50%_40%_60%_50%] shadow-[5px_5px_0px_#171717] hover:shadow-none hover:translate-y-[5px] hover:translate-x-[5px] transition-all font-sketch font-bold text-2xl"
                >
                  {w.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* The Active Stone (Charging/Flying) */}
      {stones.map(stone => {
        if (stone.state === 'pile' || stone.state === 'writing') return null;
        
        return (
          <div 
            key={stone.id}
            className="absolute flex items-center justify-center pointer-events-none z-30"
            style={{ 
              left: stone.x - 60, 
              top: stone.y - 50, 
              width: 120, 
              height: 100,
              transform: `scale(${stone.scale})`,
              opacity: stone.state === 'sinking' ? stone.scale : 1,
            }}
          >
            {/* Charge Progress Ring */}
            {(stone.state === 'charging' || stone.state === 'ready_to_throw') && (
              <svg className="absolute inset-[-20px] w-[160px] h-[140px] -rotate-90">
                <circle 
                  cx="80" cy="70" r="60" 
                  fill="none" stroke="#a1a1aa" strokeWidth="4" strokeDasharray="4 4" 
                />
                <circle 
                  cx="80" cy="70" r="60" 
                  fill="none" stroke="#171717" strokeWidth="6" 
                  strokeDasharray={`${stone.chargeProgress * 377} 377`} 
                  className="transition-all duration-100"
                />
              </svg>
            )}
            
            <div 
              className={`absolute inset-0 bg-[#a1a1aa] border-[4px] border-[#171717] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] flex items-center justify-center overflow-hidden ${stone.state === 'ready_to_throw' ? 'animate-pulse shadow-[0_0_20px_#171717]' : 'shadow-[6px_6px_0px_#171717]'}`}
            >
              <div className="p-2 w-full text-center text-[#171717] font-sketch text-xl leading-tight line-clamp-3">
                {stone.text}
              </div>
            </div>
          </div>
        );
      })}

      {/* Throw Feedback */}
      <AnimatePresence>
        {throwFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-x-0 top-1/3 z-40 flex justify-center pointer-events-none"
          >
            <p className="text-4xl md:text-5xl font-sketch font-bold text-[#171717] text-center px-6">
              {throwFeedback}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro Overlay */}
      {!introComplete && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#e5e5e5]">
          <AnimatePresence mode="wait">
            {introText && (
              <motion.p
                key={introText}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="text-4xl md:text-5xl font-sketch font-bold text-[#171717] text-center max-w-2xl px-6 leading-relaxed"
              >
                {introText}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
