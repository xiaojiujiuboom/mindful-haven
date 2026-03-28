import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, PenLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Paper {
  id: string;
  text: string;
  x: number;
  y: number;
  state: 'icon' | 'writing' | 'ready_to_burn' | 'grabbed' | 'burning';
  burnProgress: number;
}

export default function Campfire({ onBack, onComplete }: { onBack: () => void; onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showUI, setShowUI] = useState(true);
  const [inputText, setInputText] = useState('');
  const [paper, setPaper] = useState<Paper>({
    id: '1', text: '', x: 0, y: 0, state: 'icon', burnProgress: 0
  });
  const [handState, setHandState] = useState<{x: number, y: number, isPinching: boolean} | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [introText, setIntroText] = useState('');
  const [burnFeedback, setBurnFeedback] = useState('');
  
  const paperRef = useRef<Paper>(paper);
  const particlesRef = useRef<any[]>([]);
  const fireIntensityRef = useRef(1);
  const fireTargetRef = useRef(1);
  const timeRef = useRef(0);

  useEffect(() => { paperRef.current = paper; }, [paper]);

  // Intro sequence
  useEffect(() => {
    let isMounted = true;
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const runIntro = async () => {
      setIntroText("everyone carries weight...");
      await wait(3000);
      if (!isMounted) return;
      setIntroText("write down what burdens you.");
      await wait(3000);
      if (!isMounted) return;
      setIntroText("then let it burn.");
      await wait(2500);
      if (!isMounted) return;
      setIntroText('');
      setIntroComplete(true);
    };
    runIntro();
    return () => { isMounted = false; };
  }, []);

  // Fire crackle sound
  useEffect(() => {
    if (!introComplete) return;
    let audioCtx: AudioContext | null = null;
    const crackle = () => {
      if (!audioCtx) audioCtx = new AudioContext();
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const src = audioCtx.createBufferSource(); src.buffer = buf;
      const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600 + Math.random() * 400;
      const g = audioCtx.createGain(); g.gain.value = 0.08 + Math.random() * 0.05;
      src.connect(f); f.connect(g); g.connect(audioCtx.destination); src.start();
    };
    const iv = setInterval(() => { if (Math.random() < 0.4) crackle(); }, 2000);
    return () => { clearInterval(iv); if (audioCtx) audioCtx.close(); };
  }, [introComplete]);

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
          
          setHandState({ x, y, isPinching });

          // Interaction Logic
          if (paperRef.current) {
            const p = paperRef.current;
            if (p.state === 'ready_to_burn') {
              const distToPaper = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
              if (distToPaper < 150 && isPinching) {
                setPaper({ ...p, state: 'grabbed' });
              }
            } else if (p.state === 'grabbed') {
              if (isPinching) {
                setPaper({ ...p, x, y });
                
                // Check if near fire (center of screen)
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2 + 100;
                const distToFire = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                
                if (distToFire < 150) {
                  setPaper({ ...p, state: 'burning', x: centerX, y: centerY });
                  fireTargetRef.current = 2.5; // Smooth flare up target
                  onComplete?.();
                  try {
                    const audio = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8b8f75b7b.mp3');
                    audio.volume = 0.6;
                    audio.play().catch(() => {});
                  } catch(e) {}
                }
              } else {
                setPaper({ ...p, state: 'ready_to_burn' });
              }
            }
          }
        } else {
          setHandState(null);
          if (paperRef.current?.state === 'grabbed') {
            setPaper({ ...paperRef.current, state: 'ready_to_burn' });
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

  // Canvas Fire Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;
      timeRef.current += deltaTime * 0.005;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 + 185;
      
      ctx.fillStyle = '#e5e5e5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw logs (Sketch style)
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const drawLog = (x1: number, y1: number, x2: number, y2: number) => {
        ctx.lineWidth = 24;
        ctx.strokeStyle = '#171717';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.lineWidth = 16;
        ctx.strokeStyle = '#a1a1aa';
        ctx.stroke();
      };

      drawLog(centerX - 60, centerY + 30, centerX + 50, centerY - 10);
      drawLog(centerX + 60, centerY + 25, centerX - 40, centerY - 15);
      drawLog(centerX - 70, centerY + 15, centerX + 70, centerY + 15);
      ctx.restore();

      // Draw Flames (Realistic glowing bezier curves)
      ctx.save();
      const intensity = fireIntensityRef.current;
      const flameHeight = 150 * intensity;
      const sway = Math.sin(timeRef.current * 1.5) * 20;
      const sway2 = Math.cos(timeRef.current * 2.1) * 15;
      const sway3 = Math.sin(timeRef.current * 1.1) * 25;

      // Outer glow/flame (Deep Red/Orange)
      ctx.beginPath();
      ctx.moveTo(centerX - 50, centerY + 5);
      ctx.bezierCurveTo(centerX - 60 + sway, centerY + 5 - flameHeight * 0.4, centerX - 20 + sway2, centerY - flameHeight * 0.8, centerX + sway3, centerY - flameHeight * 1.2);
      ctx.bezierCurveTo(centerX + 20 + sway2, centerY + 5 - flameHeight * 0.8, centerX + 60 + sway, centerY - flameHeight * 0.4, centerX + 50, centerY);
      
      const outerGradient = ctx.createLinearGradient(centerX, centerY, centerX, centerY - flameHeight * 1.2);
      outerGradient.addColorStop(0, 'rgba(220, 38, 38, 0.95)'); // Deep red
      outerGradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.8)');
      outerGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = outerGradient;
      ctx.fill();

      // Middle flame (Orange)
      ctx.beginPath();
      ctx.moveTo(centerX - 35, centerY);
      ctx.bezierCurveTo(centerX - 40 + sway2, centerY - flameHeight * 0.3, centerX - 10 + sway3, centerY - flameHeight * 0.6, centerX + sway, centerY - flameHeight * 0.9);
      ctx.bezierCurveTo(centerX + 10 + sway3, centerY - flameHeight * 0.6, centerX + 40 + sway2, centerY - flameHeight * 0.3, centerX + 35, centerY);
      
      const midGradient = ctx.createLinearGradient(centerX, centerY, centerX, centerY - flameHeight * 0.9);
      midGradient.addColorStop(0, 'rgba(234, 88, 12, 1)'); // Deep orange
      midGradient.addColorStop(0.6, 'rgba(249, 115, 22, 0.9)');
      midGradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = midGradient;
      ctx.fill();

      // Inner core (Yellow)
      ctx.beginPath();
      ctx.moveTo(centerX - 20, centerY);
      ctx.bezierCurveTo(centerX - 20 + sway3, centerY - flameHeight * 0.2, centerX - 5 + sway, centerY - flameHeight * 0.4, centerX + sway2 * 0.5, centerY - flameHeight * 0.6);
      ctx.bezierCurveTo(centerX + 5 + sway, centerY - flameHeight * 0.4, centerX + 20 + sway3, centerY - flameHeight * 0.2, centerX + 20, centerY);
      
      const innerGradient = ctx.createLinearGradient(centerX, centerY, centerX, centerY - flameHeight * 0.6);
      innerGradient.addColorStop(0, 'rgba(253, 224, 71, 1)'); // Yellow
      innerGradient.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = innerGradient;
      ctx.fill();
      
      ctx.restore();

      // Fire particles (Sparks)
      if (Math.random() < 0.6 * intensity) {
        particlesRef.current.push({
          x: centerX + (Math.random() * 60 - 30),
          y: centerY - 20,
          size: Math.random() * 4 + 1,
          speedX: Math.random() * 3 - 1.5,
          speedY: Math.random() * -5 * intensity - 1,
          life: 1.0,
          decay: Math.random() * 0.015 + 0.005,
          color: Math.random() > 0.3 ? '#fde047' : '#f97316'
        });
      }

      // Ash particles from burning paper
      if (paperRef.current?.state === 'burning' && Math.random() < 0.8) {
        particlesRef.current.push({
          x: paperRef.current.x + (Math.random() * 100 - 50),
          y: paperRef.current.y + (Math.random() * 100 - 50),
          size: Math.random() * 8 + 4,
          speedX: Math.random() * 6 - 3,
          speedY: Math.random() * -8 - 2,
          life: 1.0,
          decay: 0.015,
          color: '#171717',
          isAsh: true
        });
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.life -= p.decay;
        p.size *= 0.95;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.isAsh) {
          ctx.strokeStyle = '#171717';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1.0;

      // Update paper burn progress
      if (paperRef.current?.state === 'burning') {
        const p = { ...paperRef.current };
        p.burnProgress += 0.005;
        p.y -= 1; // Float up
        if (p.burnProgress >= 1) {
          const feedbacks = [
            "it's gone now. you are lighter.",
            "turned to ash. nothing left to carry.",
            "the fire took it. breathe.",
            "smoke and silence. that's all that remains.",
            "released. the flames don't judge.",
            "ash to air. let the wind have it.",
          ];
          setBurnFeedback(feedbacks[Math.floor(Math.random() * feedbacks.length)]);
          setTimeout(() => setBurnFeedback(''), 5000);
          setPaper({ id: Math.random().toString(), text: '', x: 0, y: 0, state: 'icon', burnProgress: 0 });
        } else {
          setPaper(p);
        }
      }

      // Smooth fire intensity interpolation
      fireIntensityRef.current += (fireTargetRef.current - fireIntensityRef.current) * 0.03;
      if (fireTargetRef.current > 1) {
        fireTargetRef.current -= 0.005;
      }

      animationId = requestAnimationFrame(render);
    };
    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      setPaper({
        id: Math.random().toString(),
        text: inputText,
        x: window.innerWidth - 120,
        y: window.innerHeight - 180,
        state: 'ready_to_burn',
        burnProgress: 0
      });
      setInputText('');
    }
  };

  const handleReEdit = () => {
    if (paper.state === 'ready_to_burn') {
      setInputText(paper.text);
      setPaper({ ...paper, state: 'writing' });
    }
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
              <h2 className="text-5xl font-sketch font-bold text-[#171717] tracking-wider mb-2">embers</h2>
              <p className="text-[#71717a] text-3xl font-sketch tracking-wider">
                {paper.state === 'icon' && "write your regrets on a piece of paper"}
                {paper.state === 'writing' && "let it all out..."}
                {paper.state === 'ready_to_burn' && "pinch the paper and drag it into the fire"}
                {paper.state === 'grabbed' && "release it into the flames..."}
                {paper.state === 'burning' && "watch it turn to ash..."}
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

      {/* Small Paper Icon */}
      {paper.state === 'icon' && (
        <div className="absolute bottom-16 right-16 z-30">
          <button 
            onClick={() => setPaper({ ...paper, state: 'writing' })}
            className="w-24 h-32 bg-white border-[4px] border-[#171717] rounded-xl shadow-[6px_6px_0px_#71717a] hover:shadow-none hover:translate-y-[6px] hover:translate-x-[6px] flex items-center justify-center rotate-6 hover:rotate-12 transition-all group"
          >
            <PenLine size={32} strokeWidth={2.5} className="text-[#171717] group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}

      {/* Writing Modal */}
      {paper.state === 'writing' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#e5e5e5]/90 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl px-6 h-full flex flex-col items-center justify-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="w-full h-[60vh] bg-white border-[6px] border-[#171717] rounded-2xl shadow-[12px_12px_0px_#171717] p-12 relative"
            >
              <textarea
                autoFocus
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="write it down..."
                className="w-full h-full bg-transparent text-[#171717] text-4xl focus:outline-none font-sketch placeholder:text-[#a1a1aa] resize-none leading-relaxed"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="absolute bottom-8 right-8 px-8 py-3 bg-[#171717] text-[#e5e5e5] border-[3px] border-[#171717] hover:bg-[#e5e5e5] hover:text-[#171717] rounded-xl transition-all disabled:opacity-30 font-sketch text-2xl shadow-[4px_4px_0px_#71717a] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px]"
              >
                done
              </button>
            </motion.div>
          </form>
        </div>
      )}

      {/* The Paper Note - with transition animation and re-edit */}
      <AnimatePresence>
        {(paper.state === 'ready_to_burn' || paper.state === 'grabbed' || paper.state === 'burning') && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0, x: 0, y: -100 }}
            animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
            className="absolute flex items-center justify-center z-30"
            style={{
              left: paper.x - 80,
              top: paper.y - 100,
              width: 160,
              height: 200,
              transform: `rotate(${paper.state === 'grabbed' ? -5 : 4}deg) scale(${paper.state === 'burning' ? 1 - paper.burnProgress * 0.5 : 1})`,
              opacity: paper.state === 'burning' ? 1 - paper.burnProgress : 1,
              filter: paper.state === 'burning' ? `sepia(${paper.burnProgress * 100}%) brightness(${1 - paper.burnProgress * 0.5})` : 'none',
              pointerEvents: paper.state === 'ready_to_burn' ? 'auto' : 'none',
              cursor: paper.state === 'ready_to_burn' ? 'pointer' : 'default',
            }}
            onClick={paper.state === 'ready_to_burn' ? handleReEdit : undefined}
          >
            {paper.state === 'grabbed' && (
              <div className="absolute inset-[-10px] rounded-xl bg-[#171717]/10 blur-md animate-pulse" />
            )}

            <div
              className="absolute inset-0 bg-white border-[3px] border-[#171717] shadow-[4px_4px_0px_#171717] overflow-hidden rounded-lg"
              style={{
                clipPath: paper.state === 'burning'
                  ? `circle(${150 - paper.burnProgress * 200}% at 50% 100%)`
                  : 'none',
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #d4d4d8 27px, #d4d4d8 28px)',
                backgroundPosition: '0 12px',
              }}
            >
              {/* Margin line */}
              <div className="absolute left-8 top-0 bottom-0 w-[1px] bg-[#a1a1aa] opacity-40" />
              {paper.state === 'burning' && (
                <div className="absolute inset-0 bg-gradient-to-t from-orange-500/50 to-transparent" style={{ opacity: paper.burnProgress * 2 }} />
              )}
              <div className="p-4 pl-10 w-full h-full text-[#171717] font-sketch text-xl leading-[28px] line-clamp-6">
                {paper.text}
              </div>
              {paper.state === 'ready_to_burn' && (
                <div className="absolute bottom-2 right-3 text-xs font-sketch text-[#a1a1aa] opacity-60">tap to edit</div>
              )}
            </div>

            {paper.state === 'burning' && (
              <div className="absolute inset-0 border-b-[6px] border-orange-500 blur-sm rounded-lg"
                style={{ clipPath: `circle(${150 - paper.burnProgress * 200 + 10}% at 50% 100%)`, opacity: Math.sin(paper.burnProgress * Math.PI) }} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Burn Feedback */}
      <AnimatePresence>
        {burnFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-x-0 top-1/3 z-40 flex justify-center pointer-events-none"
          >
            <p className="text-4xl md:text-5xl font-sketch font-bold text-[#171717] text-center px-8 leading-relaxed max-w-2xl">
              {burnFeedback}
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
