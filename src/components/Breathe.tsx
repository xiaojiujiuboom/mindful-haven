import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Stage = 'landing' | 'calibration' | 'resonance' | 'anchor';

export default function Breathe({ onBack, onComplete }: { onBack: () => void; onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [stage, setStage] = useState<Stage>('landing');
  const [subtitle, setSubtitle] = useState('');
  const [breathText, setBreathText] = useState('');
  const [cycle, setCycle] = useState(0);
  const [showEndButtons, setShowEndButtons] = useState(false);
  const flowerScale = useRef(0);
  const showFlower = useRef(false);

  const totalCycles = 15;

  // Hand tracking refs
  const handPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const handOpenness = useRef(0.5);
  const handActive = useRef(false);

  // Animation state refs for smooth interpolation
  const currentPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const currentOpenness = useRef(0.5);
  const timeRef = useRef(0);

  // Breathing guide refs
  const guidePhase = useRef<'inhale' | 'exhale'>('inhale');
  const guideProgress = useRef(0); // 0 to 1

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 1. MediaPipe Initialization
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
          handActive.current = true;
          const landmarks = results.multiHandLandmarks[0];
          
          // Position: Use palm center (landmark 9)
          const x = (1 - landmarks[9].x) * window.innerWidth;
          const y = landmarks[9].y * window.innerHeight;
          handPos.current = { x, y };
          
          // Openness: Average distance from tips to wrist (landmark 0)
          const palmBase = landmarks[0];
          const tips = [4, 8, 12, 16, 20];
          let totalDist = 0;
          tips.forEach(tipIdx => {
            const tip = landmarks[tipIdx];
            totalDist += Math.hypot(tip.x - palmBase.x, tip.y - palmBase.y, tip.z - palmBase.z);
          });
          
          const avgDist = totalDist / 5;
          // Normalize: ~0.12 is closed fist, ~0.4 is fully open
          let rawOpenness = (avgDist - 0.12) / (0.4 - 0.12);
          handOpenness.current = Math.max(0, Math.min(1, rawOpenness));
        } else {
          handActive.current = false;
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

  // 2. Master Timeline (Text & Stages)
  useEffect(() => {
    let isMounted = true;
    const runExperience = async () => {
      if (!isMounted) return;
      
      // Stage 1: Landing
      setStage('landing');
      setSubtitle("welcome to your sanctuary...");
      await wait(3000);
      if (!isMounted) return;
      setSubtitle("find a comfortable posture, and place your device down.");
      await wait(3000);
      if (!isMounted) return;
      
      // Stage 2: Calibration
      setStage('calibration');
      setSubtitle("move your hand in front of the camera.");
      await wait(3000);
      if (!isMounted) return;
      setSubtitle("slowly open your hand to let the lotus bloom...");
      showFlower.current = true;
      await wait(4000);
      if (!isMounted) return;
      setSubtitle("and gently close it to rest.");
      await wait(4000);
      if (!isMounted) return;
      
      // Stage 3: Resonance
      setStage('resonance');
      setSubtitle("let's breathe together.");
      await wait(4000);
      if (!isMounted) return;
      setSubtitle("follow the guide. open to inhale, close to exhale.");
      await wait(5000);
      if (!isMounted) return;
      setSubtitle('');
      
      // Breathing loop starts here
      for (let i = 1; i <= totalCycles; i++) {
        if (!isMounted) return;
        setCycle(i);

        // 4s Inhale
        guidePhase.current = 'inhale';
        setBreathText("inhale...");
        await wait(4000);
        if (!isMounted) return;

        // 6s Exhale
        guidePhase.current = 'exhale';
        setBreathText("exhale...");
        await wait(6000);
      }

      if (!isMounted) return;
      setBreathText('');
      onComplete?.();
      
      // Stage 4: Anchor
      setStage('anchor');
      setSubtitle("you did wonderfully.");
      await wait(4000);
      if (!isMounted) return;
      setSubtitle("feel the stillness within you.");
      await wait(4000);
      if (!isMounted) return;
      setSubtitle("whenever you're ready, you may return.");
      await wait(4000);
      if (!isMounted) return;
      setSubtitle('');
      setShowEndButtons(true);
    };
    
    if (isReady) {
      runExperience();
    }
    return () => { isMounted = false; };
  }, [isReady]);

  // 3. Canvas Rendering (Hand-drawn Sketch Style)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    const drawPetal = (x: number, y: number, radius: number, angle: number, openness: number, isInner: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // More dramatic open/close: closed=0.1, open=1.0
      const length = radius * (0.1 + 0.9 * openness);
      const width = length * (0.12 + 0.28 * openness);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(width, -length * 0.3, width, -length * 0.8, 0, -length);
      ctx.bezierCurveTo(-width, -length * 0.8, -width, -length * 0.3, 0, 0);

      ctx.fillStyle = 'white';
      ctx.fill();

      ctx.strokeStyle = '#171717';
      ctx.lineWidth = isInner ? 2 : 3;
      ctx.stroke();

      ctx.restore();
    };

    const render = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;
      timeRef.current += 0.001 * deltaTime;

      // Resize canvas if needed
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      // Flat background (Light gray)
      ctx.fillStyle = '#e5e5e5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const targetScale = showFlower.current ? 1 : 0;
      flowerScale.current += (targetScale - flowerScale.current) * 0.02;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(flowerScale.current, flowerScale.current);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Smooth interpolation for hand position and openness
      if (handActive.current) {
        currentPos.current.x += (handPos.current.x - currentPos.current.x) * 0.1;
        currentPos.current.y += (handPos.current.y - currentPos.current.y) * 0.1;
        currentOpenness.current += (handOpenness.current - currentOpenness.current) * 0.1;
      } else {
        // Gently return to center and half-open if hand is lost
        currentPos.current.x += (window.innerWidth / 2 - currentPos.current.x) * 0.02;
        currentPos.current.y += (window.innerHeight / 2 - currentPos.current.y) * 0.02;
        currentOpenness.current += (0.2 - currentOpenness.current) * 0.02;
      }

      const cx = currentPos.current.x;
      const cy = currentPos.current.y;
      const openness = currentOpenness.current;
      const baseRadius = 140; // Large flower for dramatic effect

      // Update breathing guide progress (no circles drawn)
      if (stage === 'resonance') {
        const speed = guidePhase.current === 'inhale' ? (1000 / 4000) : (1000 / 6000);
        if (guidePhase.current === 'inhale') {
          guideProgress.current = Math.min(1, guideProgress.current + speed * (deltaTime / 1000));
        } else {
          guideProgress.current = Math.max(0, guideProgress.current - speed * (deltaTime / 1000));
        }
      }

      // --- Draw Hand-drawn Lotus ---
      const rotationOffset = Math.sin(timeRef.current * 0.5) * 0.05;

      // Layer 1: Outer petals
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i + timeRef.current * 0.05 + rotationOffset;
        drawPetal(cx, cy, baseRadius, angle, openness, false);
      }

      // Layer 2: Inner petals
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i + (Math.PI / 6) + timeRef.current * 0.05 + rotationOffset;
        drawPetal(cx, cy, baseRadius * 0.6, angle, openness, true);
      }

      // Center Core
      ctx.beginPath();
      ctx.arc(cx, cy, 10 + 4 * openness, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = '#171717';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore(); // Restore the scale transform

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [stage]);

  return (
    <div className="relative w-full h-screen bg-[#e5e5e5] p-2 md:p-6 overflow-hidden select-none">
      {/* Import Cursive Font */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
        .font-sketch {
          font-family: 'Caveat', cursive;
        }
      `}} />

      {/* Thick Comic-style Border Container */}
      <div className="relative w-full h-full border-[6px] md:border-[8px] border-[#171717] rounded-xl overflow-hidden bg-[#e5e5e5]">
        
        {/* Canvas Layer */}
        <canvas ref={canvasRef} className="absolute inset-0 z-10" />

        {/* UI Layer */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <button 
            onClick={onBack}
            className="absolute top-6 left-6 p-3 text-[#171717] hover:bg-[#171717] hover:text-[#e5e5e5] rounded-full transition-colors pointer-events-auto border-2 border-transparent hover:border-[#171717]"
          >
            <ArrowLeft size={28} strokeWidth={2.5} />
          </button>

          {/* Hidden Camera */}
          <video ref={videoRef} className="hidden" playsInline muted />

          {/* Subtitles & Guidance */}
          <div className="absolute top-1/4 w-full flex flex-col items-center px-6">
            <AnimatePresence mode="wait">
              {subtitle && (
                <motion.p 
                  key={subtitle}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="text-[#171717] text-4xl md:text-5xl font-sketch font-bold tracking-wide text-center max-w-2xl leading-relaxed"
                >
                  {subtitle}
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {breathText && (
                <motion.p 
                  key={breathText}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute top-0 text-[#171717] text-5xl md:text-6xl font-sketch font-bold tracking-widest text-center"
                >
                  {breathText}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Cycle Counter */}
          <AnimatePresence>
            {stage === 'resonance' && cycle > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 text-[#171717] font-sketch font-bold text-2xl pointer-events-none"
              >
                breath {cycle} of {totalCycles}
              </motion.div>
            )}
          </AnimatePresence>

          {/* End Buttons */}
          <AnimatePresence>
            {showEndButtons && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                className="absolute bottom-24 w-full flex justify-center gap-6 pointer-events-auto"
              >
                <button 
                  onClick={onBack}
                  className="px-8 py-3 rounded-xl border-[3px] border-[#171717] bg-[#e5e5e5] text-[#171717] hover:bg-[#171717] hover:text-[#e5e5e5] transition-all font-sketch font-bold text-2xl shadow-[4px_4px_0px_#171717] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px]"
                >
                  end practice
                </button>
                <button 
                  onClick={() => {
                    alert("Mood logged. Thank you for practicing.");
                    onBack();
                  }}
                  className="px-8 py-3 rounded-xl border-[3px] border-[#171717] bg-[#171717] text-[#e5e5e5] hover:bg-[#e5e5e5] hover:text-[#171717] transition-all font-sketch font-bold text-2xl shadow-[4px_4px_0px_#71717a] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px]"
                >
                  log mood
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
