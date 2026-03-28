import React, { useState, useRef } from 'react';
import { ArrowLeft, X, Check, Paintbrush } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality } from '@google/genai';

type Step = 'intro' | 'scene' | 'place' | 'interpret';

const sceneOptions = [
  { id: 'seaside', label: 'seaside', desc: 'waves lapping the shore' },
  { id: 'forest', label: 'forest', desc: 'tall trees and dappled light' },
  { id: 'meadow', label: 'meadow', desc: 'soft grass, open sky' },
  { id: 'room', label: 'room', desc: 'a quiet, enclosed space' },
  { id: 'clearing', label: 'clearing', desc: 'open ground under sky' },
];

const itemCategories = [
  { name: 'people', items: ['yourself', 'family', 'friend', 'stranger'] },
  { name: 'nature', items: ['sun', 'moon', 'cloud', 'tree', 'flower', 'river', 'mountain'] },
  { name: 'buildings', items: ['house', 'door', 'bridge', 'path', 'wall'] },
  { name: 'animals', items: ['cat', 'dog', 'bird', 'fish', 'wild beast'] },
  { name: 'emotions', items: ['light', 'fog', 'fire', 'rain', 'stars'] },
];

const sceneDescriptions: Record<string, string> = {
  'seaside': 'gentle waves lap against the shore. the salty breeze carries a quiet calm.',
  'forest': 'tall trees rise around you. sunlight filters through the leaves, casting soft shadows.',
  'meadow': 'soft grass stretches before you, swaying in the breeze. the horizon feels far away.',
  'room': 'you are in a quiet room. the walls feel protective, the space entirely your own.',
  'clearing': 'an open clearing lies before you. the sky stretches wide and unbroken above.',
};

const itemDescMap: Record<string, string> = {
  'yourself': 'a small figure of you stands quietly.',
  'family': 'your family is gathered nearby, warm and familiar.',
  'friend': 'a friend sits close by, at ease.',
  'stranger': 'a stranger stands in the distance, face unclear.',
  'sun': 'the sun hangs in the sky, casting warm glow.',
  'moon': 'the moon glows softly above, gentle and silver.',
  'cloud': 'clouds drift slowly across the sky.',
  'tree': 'a large tree stands tall, branches reaching outward.',
  'flower': 'flowers bloom quietly, small and vivid.',
  'river': 'a river flows through, its water calm and clear.',
  'mountain': 'mountains rise in the far distance, steady.',
  'house': 'a small house stands, its door slightly open.',
  'door': 'a door stands alone, waiting to be opened.',
  'bridge': 'a bridge arches gently, connecting two sides.',
  'path': 'a winding path stretches ahead, leading somewhere.',
  'wall': 'a wall stands firm, dividing the space.',
  'cat': 'a cat curls up peacefully, eyes half-closed.',
  'dog': 'a loyal dog sits beside you, calm and watchful.',
  'bird': 'a bird perches nearby, tilting its head.',
  'fish': 'fish swim silently beneath the water.',
  'wild beast': 'a powerful beast watches from the shadows.',
  'light': 'a warm light glows, illuminating a small area.',
  'fog': 'a thin fog hangs, softening everything.',
  'fire': 'a small fire flickers, its warmth reaching outward.',
  'rain': 'gentle rain falls, each drop soft.',
  'stars': 'stars twinkle overhead, like small promises.',
};

// Deterministic position for each item token in the tray
const getTokenStyle = (item: string, idx: number) => {
  const hash = item.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  const rotate = ((hash % 20) - 10);
  return {
    left: `${8 + col * 23 + (hash % 8)}%`,
    top: `${12 + row * 28 + (hash % 12)}%`,
    transform: `rotate(${rotate}deg)`,
  };
};

export default function Sand({ onBack, onComplete }: { onBack: () => void; onComplete?: () => void }) {
  const [step, setStep] = useState<Step>('intro');
  const [scene, setScene] = useState('');
  const [placedItems, setPlacedItems] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [interpretation, setInterpretation] = useState('');
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [sandImage, setSandImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const controlsRef = useRef<HTMLDivElement>(null);

  const addItem = (item: string) => {
    if (!placedItems.includes(item)) {
      setPlacedItems(prev => [...prev, item]);
      setSandImage(null); // clear stale image
    }
  };

  const removeItem = (item: string) => {
    setPlacedItems(prev => prev.filter(i => i !== item));
    setSandImage(null);
  };

  const generateDescription = () => {
    if (!scene) return '';
    let desc = sceneDescriptions[scene] + '\n\n';
    placedItems.forEach(item => { desc += itemDescMap[item] + '\n'; });
    return desc;
  };

  const generateSandImage = async () => {
    if (placedItems.length === 0) return;
    setIsGeneratingImage(true);
    setSandImage(null);
    setImageError('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const desc = generateDescription();
      const prompt = `Generate an image: a gentle sand tray therapy miniature scene viewed from above at a slight angle. Soft watercolor pencil style on warm cream paper. A rectangular wooden sandbox tray filled with fine sand, containing small figurines and objects: ${desc}. Warm, therapeutic, minimal. No text or words in the image.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      // Extract image from response parts
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            setSandImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            return;
          }
        }
      }
      setImageError('no image was generated');
    } catch (error: any) {
      console.error('Image generation failed:', error);
      setImageError(error?.message?.slice(0, 80) || 'could not generate image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleComplete = async () => {
    if (placedItems.length === 0) return;
    setStep('interpret');
    setIsInterpreting(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const sandboxDescription = generateDescription();

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Here is my sand tray:\n\nScene: ${scene}\nItems placed: ${placedItems.join(', ')}\n\nFull description:\n${sandboxDescription}` }] }],
        config: {
          systemInstruction: `You are a gentle, warm guide in a mindfulness sand tray exercise. The user has just created their sand tray by choosing a scene and placing symbolic items in it. Your job is to offer a soft, non-diagnostic observation about what they've created.

IMPORTANT RULES:
- NEVER diagnose or label the user
- NEVER use clinical terms
- Speak warmly, like a thoughtful friend noticing something meaningful
- Use phrases like "it seems like..." "perhaps..." "I notice..."
- Observe symbolic meanings gently (e.g., walls might represent protection, bridges suggest transitions)
- Keep it to 3-4 short, poetic observations
- End with 1-2 open-ended reflective questions
- Speak in the same language the user uses
- Keep the total response under 200 words
- Be affirming and gentle throughout`
        }
      });

      setInterpretation(response.text || 'your sandbox speaks quietly. take a moment to sit with what you see.');
      onComplete?.();
    } catch (error) {
      console.error(error);
      setInterpretation('your sandbox holds meaning in its silence. take a moment to notice what you feel as you look at what you\'ve created.\n\nsometimes the act of placing things is itself the message.');
      onComplete?.();
    } finally {
      setIsInterpreting(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#e5e5e5] p-2 md:p-6 overflow-hidden select-none">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
        .font-sketch { font-family: 'Caveat', cursive; }
        .sand-texture {
          background-color: #d4b896;
          background-image:
            radial-gradient(ellipse at 20% 50%, rgba(180,150,100,0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 30%, rgba(200,170,120,0.2) 0%, transparent 40%),
            radial-gradient(circle, rgba(160,130,80,0.08) 1px, transparent 1px);
          background-size: 100% 100%, 100% 100%, 8px 8px;
        }
      `}} />

      <div className="relative w-full h-full border-[6px] md:border-[8px] border-[#171717] rounded-xl overflow-hidden bg-[#e5e5e5] flex flex-col shadow-[8px_8px_0px_#171717]">

        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-5 border-b-[4px] border-[#171717] bg-white z-10">
          <button
            onClick={() => {
              if (step === 'intro') onBack();
              else if (step === 'scene') setStep('intro');
              else if (step === 'place') setStep('scene');
              else onBack();
            }}
            className="p-2 text-[#171717] hover:bg-[#171717] hover:text-[#e5e5e5] rounded-full transition-colors border-[3px] border-transparent hover:border-[#171717]"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h1 className="text-3xl md:text-4xl font-sketch font-bold text-[#171717] tracking-wider">sand tray</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">

            {/* Intro */}
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center justify-center p-6 md:p-12"
              >
                <div className="max-w-2xl text-center space-y-6">
                  <h2 className="text-4xl md:text-5xl font-sketch font-bold text-[#171717] mb-8">
                    imagine a quiet space...
                  </h2>
                  <p className="text-2xl md:text-3xl font-sketch text-[#71717a] leading-relaxed">
                    you can place anything here — people, animals, houses, trees, bridges, rivers, the sun, clouds...
                  </p>
                  <p className="text-2xl md:text-3xl font-sketch text-[#71717a] leading-relaxed">
                    don't worry about making it perfect. just follow what feels right.
                  </p>
                  <button
                    onClick={() => setStep('scene')}
                    className="mt-8 px-10 py-4 bg-[#171717] text-[#e5e5e5] border-[3px] border-[#171717] rounded-xl font-sketch font-bold text-2xl shadow-[4px_4px_0px_#71717a] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all"
                  >
                    begin
                  </button>
                </div>
              </motion.div>
            )}

            {/* Scene Selection */}
            {step === 'scene' && (
              <motion.div
                key="scene"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center justify-center p-6"
              >
                <h2 className="text-4xl md:text-5xl font-sketch font-bold text-[#171717] mb-12 text-center">
                  choose a place for your sandbox
                </h2>
                <div className="flex flex-wrap justify-center gap-5 max-w-3xl">
                  {sceneOptions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setScene(s.id); setStep('place'); }}
                      className="flex flex-col items-center gap-2 p-5 md:p-6 bg-white border-[4px] border-[#171717] rounded-2xl shadow-[6px_6px_0px_#171717] hover:shadow-none hover:translate-y-[6px] hover:translate-x-[6px] transition-all min-w-[130px]"
                    >
                      <span className="font-sketch font-bold text-2xl text-[#171717]">{s.label}</span>
                      <span className="font-sketch text-base text-[#71717a]">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Place Items — sand tray layout */}
            {step === 'place' && (
              <motion.div
                key="place"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col md:flex-row overflow-hidden"
              >
                {/* Left: Sand Tray Visual */}
                <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 bg-[#e5e5e5] min-h-0">
                  {/* The tray */}
                  <div
                    className="relative w-full max-w-2xl rounded-md overflow-hidden"
                    style={{
                      aspectRatio: '4 / 3',
                      border: '10px solid #9a7b4f',
                      borderTopColor: '#b8955e',
                      borderLeftColor: '#b08a52',
                      borderBottomColor: '#7a6238',
                      borderRightColor: '#85693f',
                      boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.15), 6px 6px 0px #171717',
                    }}
                  >
                    {/* Sand background */}
                    <div className="absolute inset-0 sand-texture" />

                    {/* AI generated image */}
                    {sandImage && (
                      <motion.img
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                        src={sandImage}
                        alt="Your sandbox"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    {/* Item tokens (shown when no AI image) */}
                    {!sandImage && !isGeneratingImage && (
                      <div className="absolute inset-0">
                        {placedItems.length === 0 ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <p className="font-sketch text-xl text-[#a08050] opacity-50 text-center px-8">
                              place items from the panel to build your world...
                            </p>
                          </div>
                        ) : (
                          placedItems.map((item, idx) => (
                            <motion.div
                              key={item}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="absolute"
                              style={getTokenStyle(item, idx)}
                            >
                              <div
                                className="px-3 py-1.5 bg-white/85 backdrop-blur-sm rounded-full font-sketch text-sm border-[2px] border-[#a08050] shadow-[1px_2px_4px_rgba(0,0,0,0.12)] cursor-pointer hover:bg-white hover:scale-110 transition-all whitespace-nowrap"
                                onClick={() => removeItem(item)}
                              >
                                {item} <span className="text-[#a08050] text-xs ml-0.5">&times;</span>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Painting overlay — animated brushstrokes */}
                    {isGeneratingImage && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden">
                        {/* Animated sand sweep */}
                        <div className="absolute inset-0 bg-[#d4b896]" />
                        {[0, 1, 2, 3, 4].map(i => (
                          <motion.div
                            key={i}
                            className="absolute rounded-full"
                            style={{
                              width: '120%',
                              height: 40 + i * 15,
                              background: `linear-gradient(90deg, transparent, rgba(${180 - i * 10},${150 - i * 8},${100 - i * 5},0.25), transparent)`,
                              top: `${15 + i * 16}%`,
                              left: '-10%',
                            }}
                            animate={{
                              x: ['-20%', '20%', '-20%'],
                              opacity: [0.3, 0.6, 0.3],
                            }}
                            transition={{
                              duration: 3 + i * 0.5,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: i * 0.4,
                            }}
                          />
                        ))}
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="relative text-center z-10"
                        >
                          <Paintbrush size={36} className="mx-auto mb-3 text-[#7a6238]" />
                          <p className="font-sketch text-2xl text-[#5a4a3a]">painting your world...</p>
                          <p className="font-sketch text-base text-[#a08050] mt-1">this may take a moment</p>
                        </motion.div>
                      </div>
                    )}
                  </div>

                  {/* Scene label */}
                  <p className="mt-2 font-sketch text-lg text-[#71717a]">
                    scene: {scene} {placedItems.length > 0 && `/ ${placedItems.length} items`}
                  </p>
                  {imageError && (
                    <p className="font-sketch text-sm text-[#a1a1aa] mt-1">{imageError}</p>
                  )}
                </div>

                {/* Right: Controls Panel */}
                <div
                  ref={controlsRef}
                  className="w-full md:w-80 lg:w-96 border-t-[4px] md:border-t-0 md:border-l-[4px] border-[#171717] bg-white p-4 md:p-5 overflow-y-auto flex flex-col gap-4"
                >
                  {/* Text description (collapsible feel) */}
                  {placedItems.length > 0 && (
                    <div className="text-base font-sketch text-[#71717a] leading-relaxed border-b border-[#e4e4e7] pb-3 max-h-28 overflow-y-auto">
                      {generateDescription()}
                    </div>
                  )}

                  {/* Category Tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    {itemCategories.map((cat, idx) => (
                      <button
                        key={cat.name}
                        onClick={() => setActiveCategory(idx)}
                        className={`px-3 py-1 rounded-lg font-sketch font-bold text-base border-[2px] border-[#171717] transition-all ${
                          activeCategory === idx
                            ? 'bg-[#171717] text-[#e5e5e5]'
                            : 'bg-white text-[#171717] hover:bg-[#f4f4f5]'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Items Grid */}
                  <div className="flex flex-wrap gap-1.5">
                    {itemCategories[activeCategory].items.map(item => {
                      const isPlaced = placedItems.includes(item);
                      return (
                        <button
                          key={item}
                          onClick={() => isPlaced ? removeItem(item) : addItem(item)}
                          className={`px-3 py-1 rounded-lg font-sketch text-base border-[2px] border-[#171717] transition-all ${
                            isPlaced
                              ? 'bg-[#171717] text-[#e5e5e5] shadow-none'
                              : 'bg-white text-[#171717] shadow-[2px_2px_0px_#171717] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]'
                          }`}
                        >
                          {isPlaced && <Check size={12} className="inline mr-1" />}
                          {item}
                        </button>
                      );
                    })}
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 mt-auto">
                    <button
                      onClick={generateSandImage}
                      disabled={placedItems.length === 0 || isGeneratingImage}
                      className="w-full py-2.5 bg-white text-[#171717] border-[3px] border-[#171717] rounded-xl font-sketch font-bold text-xl shadow-[3px_3px_0px_#171717] hover:shadow-none hover:translate-y-[3px] hover:translate-x-[3px] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                      <Paintbrush size={18} />
                      {isGeneratingImage ? 'painting...' : 'paint my sandbox'}
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={placedItems.length === 0}
                      className="w-full py-2.5 bg-[#171717] text-[#e5e5e5] border-[3px] border-[#171717] rounded-xl font-sketch font-bold text-xl shadow-[3px_3px_0px_#71717a] hover:shadow-none hover:translate-y-[3px] hover:translate-x-[3px] transition-all disabled:opacity-30"
                    >
                      i'm finished
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Interpretation */}
            {step === 'interpret' && (
              <motion.div
                key="interpret"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center p-6 md:p-12 overflow-y-auto"
              >
                <div className="max-w-2xl w-full py-4">
                  {isInterpreting ? (
                    <div className="text-center">
                      <motion.p
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-3xl md:text-4xl font-sketch font-bold text-[#171717]"
                      >
                        looking at your sandbox...
                      </motion.p>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.5 }}
                      className="space-y-8"
                    >
                      {/* Show AI image in interpretation too if available */}
                      {sandImage && (
                        <div className="rounded-xl overflow-hidden border-[4px] border-[#171717] shadow-[6px_6px_0px_#171717]">
                          <img src={sandImage} alt="Your sandbox" className="w-full h-auto" />
                        </div>
                      )}

                      <div className="bg-white border-[4px] border-[#171717] rounded-2xl shadow-[6px_6px_0px_#171717] p-8 md:p-10">
                        <p className="text-2xl md:text-3xl font-sketch text-[#171717] leading-relaxed whitespace-pre-line">
                          {interpretation}
                        </p>
                      </div>

                      <div className="flex flex-col md:flex-row justify-center gap-4">
                        <button
                          onClick={() => { setStep('place'); setInterpretation(''); }}
                          className="px-8 py-3 bg-white text-[#171717] border-[3px] border-[#171717] rounded-xl font-sketch font-bold text-2xl shadow-[4px_4px_0px_#171717] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all"
                        >
                          change something
                        </button>
                        <button
                          onClick={onBack}
                          className="px-8 py-3 bg-[#171717] text-[#e5e5e5] border-[3px] border-[#171717] rounded-xl font-sketch font-bold text-2xl shadow-[4px_4px_0px_#71717a] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all"
                        >
                          return to sanctuary
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
