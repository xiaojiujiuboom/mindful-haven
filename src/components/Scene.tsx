import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SceneProps {
  onSelectModule: (id: string) => void;
  menuItems: any[];
  completedModules: Set<string>;
}

interface InteractiveElement {
  id: string;
  moduleId: string;
  src: string;
  left: number;
  top: number;
  width: number;
}

// Positions as % of the background image dimensions (2754 x 1536)
const baseElements = [
  { id: 'bird',  moduleId: 'flight',    baseSrc: '/pic/bird.png',  colorSrc: '/pic/bird.png',  left: 3,  top: 3,  width: 22 },
  { id: 'fire',  moduleId: 'campfire',  baseSrc: '/pic/fire.png',  colorSrc: '/pic/fire2.png',  left: 5, top: 48, width: 35 },
  { id: 'cat',   moduleId: 'breathe',   baseSrc: '/pic/cat.png',   colorSrc: '/pic/cat2.png',   left: 55, top: 36, width: 40 },
  { id: 'book',  moduleId: 'journal',   baseSrc: '/pic/book.png',  colorSrc: '/pic/book2.png',  left: 71, top: 84, width: 16 },
  { id: 'lanzi', moduleId: 'pond',      baseSrc: '/pic/lanzi.png', colorSrc: '/pic/lanzi2.png', left: 22, top: 74, width: 30 },
  { id: 'sand',  moduleId: 'sand',      baseSrc: '/pic/sand.png',  colorSrc: '/pic/sand2.png',  left: 55, top: 75, width: 22 },
];

function getElements(completedModules: Set<string>): InteractiveElement[] {
  return baseElements.map(el => ({
    id: el.id,
    moduleId: el.moduleId,
    src: completedModules.has(el.moduleId) ? el.colorSrc : el.baseSrc,
    left: el.left,
    top: el.top,
    width: el.width,
  }));
}

const BG_ASPECT = 2754 / 1536; // ~1.793

export default function Scene({ onSelectModule, menuItems, completedModules }: SceneProps) {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgBounds, setImgBounds] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const elements = getElements(completedModules);

  const getModuleInfo = (id: string) => menuItems.find(m => m.id === id);

  // Auto-dismiss welcome after 6s
  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // Calculate the actual rendered image bounds within the container
  useEffect(() => {
    const calc = () => {
      const el = containerRef.current;
      if (!el) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const containerAspect = cw / ch;

      let w: number, h: number, x: number, y: number;
      if (containerAspect > BG_ASPECT) {
        // Container is wider -> image fills height, centered horizontally
        h = ch;
        w = ch * BG_ASPECT;
        x = (cw - w) / 2;
        y = 0;
      } else {
        // Container is taller -> image fills width, centered vertically
        w = cw;
        h = cw / BG_ASPECT;
        x = 0;
        y = (ch - h) / 2;
      }
      setImgBounds({ x, y, w, h });
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-[#b8b8b8]"
    >
      {/* Background image */}
      <img
        src="/pic/bg.png"
        alt="Healing Cabin"
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
        onLoad={() => {
          // Recalculate on image load
          const el = containerRef.current;
          if (el) {
            const event = new Event('resize');
            window.dispatchEvent(event);
          }
        }}
      />

      {/* Interactive elements overlay - positioned to match image bounds */}
      {imgBounds.w > 0 && (
        <div
          className="absolute"
          style={{
            left: imgBounds.x,
            top: imgBounds.y,
            width: imgBounds.w,
            height: imgBounds.h,
          }}
        >
          {elements.map((el) => {
            const info = getModuleInfo(el.moduleId);
            const isHovered = hoveredModule === el.moduleId;

            return (
              <div
                key={el.id}
                className="absolute cursor-pointer group"
                style={{
                  left: `${el.left}%`,
                  top: `${el.top}%`,
                  width: `${el.width}%`,
                }}
                onMouseEnter={() => setHoveredModule(el.moduleId)}
                onMouseLeave={() => setHoveredModule(null)}
                onClick={() => onSelectModule(el.moduleId)}
              >
                {/* Element image */}
                <img
                  src={el.src}
                  alt={info?.title || el.id}
                  className="w-full h-auto transition-all duration-300 group-hover:scale-110 group-hover:brightness-110 group-hover:drop-shadow-[0_4px_16px_rgba(0,0,0,0.25)]"
                  draggable={false}
                />

                {/* Tooltip above element */}
                <AnimatePresence>
                  {isHovered && info && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                      style={{ top: -14, transform: 'translateX(-50%) translateY(-100%)' }}
                    >
                      <div className="bg-white border-[3px] border-[#171717] rounded-xl px-5 py-2 shadow-[4px_4px_0px_#171717] whitespace-nowrap">
                        <h3 className="font-sketch font-bold text-lg md:text-2xl text-[#171717] text-center leading-tight">
                          {info.title}
                        </h3>
                        <p className="font-sketch text-xs md:text-base text-[#71717a] text-center leading-tight">
                          {info.subtitle}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
      {/* Welcome overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-30 flex items-start justify-center pointer-events-none pt-[12%]"
            onClick={() => setShowWelcome(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="bg-white/90 backdrop-blur-sm border-[3px] border-[#171717] rounded-2xl px-8 py-5 shadow-[6px_6px_0px_#171717] max-w-xl text-center pointer-events-auto cursor-pointer"
            >
              <h2 className="font-sketch font-bold text-3xl md:text-4xl text-[#171717] mb-2">
                welcome to your sanctuary
              </h2>
              <p className="font-sketch text-xl md:text-2xl text-[#71717a] leading-relaxed">
                each element in this scene is a doorway. click on anything that calls to you.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
