import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Breathe from './components/Breathe';
import Flight from './components/Flight';
import Campfire from './components/Campfire';
import Pond from './components/Pond';
import Journal from './components/Journal';
import Sand from './components/Sand';
import { Wind, Bird, Flame, Droplets, Volume2, VolumeX, PenTool, Layers } from 'lucide-react';

import Scene from './components/Scene';

const menuItems = [
  { id: 'breathe', title: 'resonance', subtitle: 'sync with your breath', icon: Wind, component: Breathe },
  { id: 'journal', title: 'echoes', subtitle: 'a safe space to write', icon: PenTool, component: Journal },
  { id: 'flight', title: 'flight', subtitle: 'guide the bird', icon: Bird, component: Flight },
  { id: 'campfire', title: 'embers', subtitle: 'burn your regrets', icon: Flame, component: Campfire },
  { id: 'pond', title: 'whispers', subtitle: 'cast stones into water', icon: Droplets, component: Pond },
  { id: 'sand', title: 'sand tray', subtitle: 'explore your inner world', icon: Layers, component: Sand },
];

// Generate ambient brown noise buffer (sounds like soft ocean/wind)
function createAmbientAudio(audioCtx: AudioContext) {
  const sampleRate = audioCtx.sampleRate;
  const duration = 2; // 2 second loop
  const bufferLength = duration * sampleRate;
  const buffer = audioCtx.createBuffer(2, bufferLength, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < bufferLength; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Low-pass filter to soften the noise
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  const gain = audioCtx.createGain();
  gain.gain.value = 0.18;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();

  return { source, gain };
}

export default function App() {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);

  const markComplete = useCallback((moduleId: string) => {
    setCompletedModules(prev => new Set(prev).add(moduleId));
  }, []);

  const startAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      audioNodesRef.current = createAmbientAudio(ctx);
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (audioNodesRef.current && audioCtxRef.current) {
      audioNodesRef.current.gain.gain.setTargetAtTime(0.18, audioCtxRef.current.currentTime, 0.3);
    }
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      startAudio();
    } else {
      // Mute: fade out
      if (audioNodesRef.current && audioCtxRef.current) {
        audioNodesRef.current.gain.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.3);
      }
      setIsMuted(true);
    }
  }, [isMuted, startAudio]);

  const ActiveComponent = menuItems.find(m => m.id === activeModule)?.component;

  return (
    <div className="w-full h-screen bg-[#e5e5e5] text-[#171717] overflow-hidden font-sans selection:bg-[#171717] selection:text-[#e5e5e5]">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
        .font-sketch {
          font-family: 'Caveat', cursive;
        }
      `}} />

      <button
        onClick={toggleMute}
        className="fixed top-8 right-8 z-50 p-3 text-[#171717] hover:bg-[#171717] hover:text-[#e5e5e5] rounded-full transition-colors border-[3px] border-transparent hover:border-[#171717]"
      >
        {isMuted ? <VolumeX size={28} strokeWidth={2.5} /> : <Volume2 size={28} strokeWidth={2.5} />}
      </button>

      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-50 bg-[#e5e5e5]"
          >
            <div className="max-w-3xl mx-auto flex flex-col items-center">
              <h1 className="text-6xl md:text-8xl font-sketch font-bold tracking-wider mb-8 text-[#171717]">
                sanctuary
              </h1>
              <p className="text-xl md:text-3xl font-sketch text-[#71717a] mb-12 leading-relaxed max-w-2xl">
                a quiet space for your mind. take a deep breath, leave your worries behind, and explore these hand-drawn worlds.
              </p>
              <button
                onClick={() => setShowIntro(false)}
                className="px-10 py-4 rounded-2xl border-[3px] border-[#171717] bg-[#171717] text-[#e5e5e5] hover:bg-[#e5e5e5] hover:text-[#171717] transition-all font-sketch font-bold text-3xl shadow-[6px_6px_0px_#71717a] hover:shadow-none hover:translate-y-[6px] hover:translate-x-[6px]"
              >
                begin journey
              </button>
            </div>
          </motion.div>
        ) : !activeModule ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
            className="absolute inset-0 bg-[#b8b8b8]"
          >
            <div className="relative w-full h-full">
              <Scene
                menuItems={menuItems}
                completedModules={completedModules}
                onSelectModule={(id) => {
                  setActiveModule(id);
                  if (isMuted) startAudio();
                }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="module"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {ActiveComponent && <ActiveComponent onBack={() => setActiveModule(null)} onComplete={() => activeModule && markComplete(activeModule)} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
