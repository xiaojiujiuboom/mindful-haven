import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

const flowerStyles = `
.flower-container { position: relative; width: 300px; height: 300px; margin: 20px auto; }
.flower { position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.center { position: absolute; width: 60px; height: 60px; background: radial-gradient(circle at 35% 35%, #ffdd59, #ffa502); border-radius: 50%; z-index: 10; left: 50%; top: 54%; transform: translate(-50%, -50%); transition: transform 1.5s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 15px rgba(255, 165, 2, 0.3); }
.center::after { content: ''; position: absolute; width: 30%; height: 30%; border-radius: 50%; background: rgba(255, 255, 255, 0.8); top: 20%; left: 20%; }
.flower.closed .center { transform: translate(-50%, -50%) scale(0.5); }
.petals { position: absolute; width: 100%; height: 100%; z-index: 5; }
.inner-petals, .outer-petals { position: absolute; width: 100%; height: 100%; }
.petal { position: absolute; width: 100px; height: 140px; background: linear-gradient(to bottom, #ff9ff3, #f368e0); border-radius: 50% 50% 50% 50% / 80% 80% 20% 20%; transform-origin: center bottom; left: calc(50% - 50px); bottom: calc(50% - 10px); transition: transform 1.5s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 10px rgba(243, 104, 224, 0.2); }
.petal::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to right, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1) 40%, rgba(255, 255, 255, 0.1) 60%, rgba(255, 255, 255, 0.4)); border-radius: inherit; }
.inner-petals .petal { width: 80px; height: 120px; left: calc(50% - 40px); background: linear-gradient(to bottom, #ff9ff3, #c56cf0); z-index: 6; }
.petals .petal:nth-child(1) { transform: rotate(0deg); }
.petals .petal:nth-child(2) { transform: rotate(45deg); }
.petals .petal:nth-child(3) { transform: rotate(90deg); }
.petals .petal:nth-child(4) { transform: rotate(135deg); }
.petals .petal:nth-child(5) { transform: rotate(180deg); }
.petals .petal:nth-child(6) { transform: rotate(225deg); }
.petals .petal:nth-child(7) { transform: rotate(270deg); }
.petals .petal:nth-child(8) { transform: rotate(315deg); }
.flower.closed .outer-petals .petal:nth-child(1) { transform: rotate(0deg) translateY(-40px) scale(0.3); }
.flower.closed .outer-petals .petal:nth-child(2) { transform: rotate(45deg) translateY(-40px) scale(0.3); }
.flower.closed .outer-petals .petal:nth-child(3) { transform: rotate(90deg) translateY(-40px) scale(0.3); }
.flower.closed .outer-petals .petal:nth-child(4) { transform: rotate(135deg) translateY(-40px) scale(0.3); }
.flower.closed .outer-petals .petal:nth-child(5) { transform: rotate(180deg) translateY(-40px) scale(0.3); }
.flower.closed .outer-petals .petal:nth-child(6) { transform: rotate(225deg) translateY(-40px) scale(0.3); }
.flower.closed .outer-petals .petal:nth-child(7) { transform: rotate(270deg) translateY(-40px) scale(0.3); }
.flower.closed .outer-petals .petal:nth-child(8) { transform: rotate(315deg) translateY(-40px) scale(0.3); }
.flower.closed .inner-petals .petal:nth-child(1) { transform: rotate(0deg) translateY(-25px) scale(0.25); }
.flower.closed .inner-petals .petal:nth-child(2) { transform: rotate(45deg) translateY(-25px) scale(0.25); }
.flower.closed .inner-petals .petal:nth-child(3) { transform: rotate(90deg) translateY(-25px) scale(0.25); }
.flower.closed .inner-petals .petal:nth-child(4) { transform: rotate(135deg) translateY(-25px) scale(0.25); }
.flower.closed .inner-petals .petal:nth-child(5) { transform: rotate(180deg) translateY(-25px) scale(0.25); }
.flower.closed .inner-petals .petal:nth-child(6) { transform: rotate(225deg) translateY(-25px) scale(0.25); }
.flower.closed .inner-petals .petal:nth-child(7) { transform: rotate(270deg) translateY(-25px) scale(0.25); }
.flower.closed .inner-petals .petal:nth-child(8) { transform: rotate(315deg) translateY(-25px) scale(0.25); }
.stem { position: absolute; width: 4px; height: 60px; background: linear-gradient(to bottom, #26de81, #20bf6b); bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 1; }
.leaf { position: absolute; width: 40px; height: 20px; background: linear-gradient(to top, #26de81, #20bf6b); border-radius: 50% 50% 0 50%; bottom: 50px; z-index: 1; }
.leaf-left { left: calc(50% - 45px); transform: rotate(-30deg); }
.leaf-right { right: calc(50% - 45px); transform: rotate(30deg) scaleX(-1); }
.breathing-circle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 350px; height: 350px; border-radius: 50%; background-color: rgba(255, 255, 255, 0.2); z-index: 5; box-shadow: 0 0 30px rgba(0, 0, 0, 0.1) inset; transition: transform 4s ease-in-out; }
.breathing-circle.in { transform: translate(-50%, -50%) scale(0.8); }
.breathing-circle.out { transform: translate(-50%, -50%) scale(1); }
`;

function isHandClosed(landmarks: any) {
  const distance3D = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
  const palmBase = landmarks[0];
  
  const thumbTip = landmarks[4];
  const indexFingerTip = landmarks[8];
  const middleFingerTip = landmarks[12];
  const ringFingerTip = landmarks[16];
  const pinkyTip = landmarks[20];
  
  const distThumb = distance3D(thumbTip, palmBase);
  const distIndex = distance3D(indexFingerTip, palmBase);
  const distMiddle = distance3D(middleFingerTip, palmBase);
  const distRing = distance3D(ringFingerTip, palmBase);
  const distPinky = distance3D(pinkyTip, palmBase);

  const indexPIP = landmarks[6];
  const middlePIP = landmarks[10];
  const ringPIP = landmarks[14];
  const pinkyPIP = landmarks[18];

  const distIndexPIP = distance3D(indexPIP, palmBase);
  const distMiddlePIP = distance3D(middlePIP, palmBase);
  const distRingPIP = distance3D(ringPIP, palmBase);
  const distPinkyPIP = distance3D(pinkyPIP, palmBase);

  const isIndexBent = distIndex < distIndexPIP * 1.1;
  const isMiddleBent = distMiddle < distMiddlePIP * 1.1;
  const isRingBent = distRing < distRingPIP * 1.1;
  const isPinkyBent = distPinky < distPinkyPIP * 1.1;

  const bentFingers = [isIndexBent, isMiddleBent, isRingBent, isPinkyBent].filter(Boolean).length;
  return bentFingers >= 3;
}

export default function Meditation({ onBack }: { onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isBreathingIn, setIsBreathingIn] = useState(false);
  const [status, setStatus] = useState('Loading camera & AI models...');
  const [handStatus, setHandStatus] = useState('No hands detected');
  const [isReady, setIsReady] = useState(false);

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
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults((results: any) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          setHandStatus(`Detected ${results.multiHandLandmarks.length} hand(s)`);
          let leftClosed = false;
          let rightClosed = false;

          for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].label;
            const isClosed = isHandClosed(landmarks);
            if (handedness === 'Left') leftClosed = isClosed;
            else rightClosed = isClosed;
          }

          const isClosed = results.multiHandLandmarks.length === 2 
            ? (leftClosed && rightClosed) 
            : (leftClosed || rightClosed);

          setIsBreathingIn(isClosed);
        } else {
          setHandStatus('No hands detected');
        }
      });

      if (videoRef.current) {
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        
        camera.start().then(() => {
          setStatus('Ready. Open hands to bloom, close to breathe in.');
          setIsReady(true);
        }).catch((e: any) => {
          setStatus('Camera access failed. Please allow camera permissions.');
          console.error(e);
        });
      }
    };

    initMediaPipe();

    return () => {
      if (camera) camera.stop();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-teal-100 to-pink-100 overflow-hidden flex flex-col items-center justify-center select-none">
      <style>{flowerStyles}</style>

      {/* Back Button */}
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 z-50 p-3 bg-white/30 rounded-full text-slate-800 hover:bg-white/50 transition-colors backdrop-blur-md shadow-sm"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Camera Feed (Small preview) */}
      <div className="absolute top-8 right-8 w-48 h-36 bg-black/10 rounded-xl overflow-hidden border-2 border-white/50 shadow-lg z-20">
        <video ref={videoRef} className="w-full h-full object-cover transform -scale-x-100" playsInline muted />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs text-center p-2">
            <Camera className="animate-pulse mb-1" size={16} />
            <br/>{status}
          </div>
        )}
      </div>

      {/* Status Texts */}
      <div className="absolute top-24 text-center z-20">
        <h1 className="text-3xl font-light text-slate-800 mb-2">Mindful Breathing</h1>
        <p className="text-slate-600 max-w-md px-4">
          Use your camera to control your breathing. Slowly close your hands into fists to breathe in (flower closes), and open your hands to breathe out (flower blooms).
        </p>
        <div className="mt-4 inline-block px-4 py-2 bg-white/50 rounded-full text-sm text-slate-700 backdrop-blur-sm shadow-sm">
          {handStatus}
        </div>
      </div>

      {/* The Flower Animation */}
      <div className={`breathing-circle ${isBreathingIn ? 'in' : 'out'}`}></div>
      
      <div className="flower-container">
        <div className={`flower ${isBreathingIn ? 'closed' : ''}`}>
          <div className="stem"></div>
          <div className="leaf leaf-left"></div>
          <div className="leaf leaf-right"></div>
          
          <div className="petals">
            <div className="outer-petals">
              {Array.from({length: 8}).map((_, i) => <div key={`outer-${i}`} className="petal"></div>)}
            </div>
            <div className="inner-petals">
              {Array.from({length: 8}).map((_, i) => <div key={`inner-${i}`} className="petal"></div>)}
            </div>
          </div>
          
          <div className="center"></div>
        </div>
      </div>

      <div className="absolute bottom-20 text-2xl font-bold text-slate-800 tracking-widest transition-opacity duration-1000">
        {isBreathingIn ? 'Breathe In...' : 'Breathe Out...'}
      </div>
    </div>
  );
}
