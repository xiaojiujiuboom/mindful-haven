import React from 'react';
import { motion } from 'motion/react';
import { Flower, CloudRain, Bird } from 'lucide-react';

export default function Home({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden flex flex-col items-center justify-center">
      {/* Starry Sky Background */}
      <div className="absolute inset-0 z-0">
        {Array.from({ length: 100 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 3 + 'px',
              height: Math.random() * 3 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random(),
            }}
            animate={{
              opacity: [Math.random(), Math.random() * 0.5 + 0.5, Math.random()],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Campfire Glow */}
      <motion.div
        className="absolute bottom-10 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl z-0"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="z-10 text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-4xl md:text-6xl font-serif text-slate-200 mb-4 tracking-wider"
        >
          Mindful Haven
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-slate-400 text-lg md:text-xl font-light"
        >
          A safe space for your mind to rest and heal.
        </motion.p>
      </div>

      {/* Interactive Elements */}
      <div className="z-10 flex flex-col md:flex-row gap-8 items-center justify-center mt-8">
        <InteractiveNode 
          icon={<Flower size={32} />} 
          label="Breathe & Bloom" 
          description="Meditation through gesture"
          onClick={() => onNavigate('meditation')}
          delay={0.2}
        />
        <InteractiveNode 
          icon={<CloudRain size={32} />} 
          label="Release Worries" 
          description="Let go of your anxiety"
          onClick={() => onNavigate('release')}
          delay={0.4}
        />
        <InteractiveNode 
          icon={<Bird size={32} />} 
          label="Free Flight" 
          description="Become a bird, fly aimlessly"
          onClick={() => onNavigate('flight')}
          delay={0.6}
        />
      </div>
    </div>
  );
}

function InteractiveNode({ icon, label, description, onClick, delay }: { icon: React.ReactNode, label: string, description: string, onClick: () => void, delay: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/50 shadow-xl hover:shadow-indigo-500/20 hover:border-indigo-500/30 transition-all group w-64"
    >
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 mb-4 group-hover:text-indigo-300 group-hover:bg-slate-700 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-medium text-slate-200 mb-2">{label}</h3>
      <p className="text-sm text-slate-400 text-center">{description}</p>
    </motion.button>
  );
}
