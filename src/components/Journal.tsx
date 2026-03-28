import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Trash2, Book, MessageCircle, CloudRain, Cloud, Sun, Wind, BatteryWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

type Step = 'emotion' | 'intent' | 'journal' | 'chat';
type Emotion = 'sad' | 'confused' | 'peaceful' | 'angry' | 'exhausted' | null;

const emotions = [
  { id: 'sad', icon: CloudRain, label: 'rainy' },
  { id: 'confused', icon: Cloud, label: 'cloudy' },
  { id: 'angry', icon: Wind, label: 'stormy' },
  { id: 'exhausted', icon: BatteryWarning, label: 'drained' },
  { id: 'peaceful', icon: Sun, label: 'sunny' },
];

export default function Journal({ onBack, onComplete }: { onBack: () => void; onComplete?: () => void }) {
  const [step, setStep] = useState<Step>('emotion');
  const [emotion, setEmotion] = useState<Emotion>(null);
  
  // Chat State
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Journal State
  const [journalText, setJournalText] = useState('');
  const [journalSaved, setJournalSaved] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (step === 'chat') scrollToBottom();
  }, [messages, isTyping, step]);

  const handleEmotionSelect = (e: Emotion) => {
    setEmotion(e);
    setStep('intent');
  };

  const startChat = () => {
    setStep('chat');
    setMessages([
      { role: 'model', text: `I see you're feeling a bit ${emotion} today. I'm here to listen. What's on your mind?` }
    ]);
  };

  const handleSendChat = async () => {
    if (!input.trim()) return;
    
    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsTyping(true);
    onComplete?.();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const contents = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: userText }] });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          systemInstruction: `You are a compassionate, empathetic listener in a lofi, hand-drawn sanctuary app. The user is currently feeling ${emotion}. Your goal is to provide a safe space for them to vent. Use Rogerian therapy techniques: reflect their feelings, validate their emotions, and offer gentle, non-judgmental support. Keep responses concise (1-3 short sentences), warm, and conversational, like a close friend writing a note back to them. Do not give unsolicited advice unless explicitly asked. Speak in the same language the user uses. Use a gentle, poetic, and comforting tone.`
        }
      });

      setMessages(prev => [...prev, { role: 'model', text: response.text || '...' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, my pen broke for a second. Could you say that again?' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const [bottleDrifting, setBottleDrifting] = useState(false);

  const handleSaveJournal = () => {
    if (!journalText.trim()) return;
    setJournalSaved(true);
    onComplete?.();
    // Start bottle drift after a moment
    setTimeout(() => setBottleDrifting(true), 800);
    setTimeout(() => {
      setStep('intent');
      setJournalText('');
      setJournalSaved(false);
      setBottleDrifting(false);
    }, 6000);
  };

  return (
    <div className="relative w-full h-screen bg-[#e5e5e5] p-2 md:p-6 overflow-hidden select-none">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
        .font-sketch {
          font-family: 'Caveat', cursive;
        }
        .notebook-lines {
          background-image: linear-gradient(#d4d4d8 2px, transparent 2px);
          background-size: 100% 3rem;
          background-position: 0 2.5rem;
        }
        @keyframes oceanWave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes oceanSwell {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}} />

      <div className="relative w-full h-full border-[6px] md:border-[8px] border-[#171717] rounded-xl overflow-hidden bg-[#e5e5e5] flex flex-col shadow-[8px_8px_0px_#171717]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b-[4px] border-[#171717] bg-white z-10">
          <button 
            onClick={() => {
              if (step === 'emotion') onBack();
              else if (step === 'intent') setStep('emotion');
              else setStep('intent');
            }}
            className="p-3 text-[#171717] hover:bg-[#171717] hover:text-[#e5e5e5] rounded-full transition-colors border-[3px] border-transparent hover:border-[#171717]"
          >
            <ArrowLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-4xl md:text-5xl font-sketch font-bold text-[#171717] tracking-wider">echoes</h1>
          <div className="w-14" /> {/* Spacer for centering */}
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            
            {/* Step 1: Emotion */}
            {step === 'emotion' && (
              <motion.div 
                key="emotion"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center justify-center p-6"
              >
                <h2 className="text-4xl md:text-5xl font-sketch font-bold text-[#171717] mb-12 text-center">
                  how is your heart feeling right now?
                </h2>
                <div className="flex flex-wrap justify-center gap-6 max-w-3xl">
                  {emotions.map(emo => (
                    <button
                      key={emo.id}
                      onClick={() => handleEmotionSelect(emo.id as Emotion)}
                      className="flex flex-col items-center gap-3 p-6 bg-white border-[4px] border-[#171717] rounded-2xl shadow-[6px_6px_0px_#171717] hover:shadow-none hover:translate-y-[6px] hover:translate-x-[6px] transition-all group"
                    >
                      <emo.icon size={48} strokeWidth={2} className="text-[#171717] group-hover:scale-110 transition-transform" />
                      <span className="font-sketch font-bold text-2xl text-[#171717]">{emo.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Intent */}
            {step === 'intent' && (
              <motion.div 
                key="intent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center justify-center p-6"
              >
                <h2 className="text-4xl md:text-5xl font-sketch font-bold text-[#171717] mb-12 text-center">
                  what do you need today?
                </h2>
                <div className="flex flex-col md:flex-row justify-center gap-8 max-w-4xl w-full">
                  <button
                    onClick={() => setStep('journal')}
                    className="flex-1 flex flex-col items-center gap-6 p-10 bg-white border-[4px] border-[#171717] rounded-3xl shadow-[8px_8px_0px_#171717] hover:shadow-none hover:translate-y-[8px] hover:translate-x-[8px] transition-all group"
                  >
                    <Book size={64} strokeWidth={1.5} className="text-[#171717] group-hover:scale-110 transition-transform" />
                    <div className="text-center">
                      <span className="block font-sketch font-bold text-4xl text-[#171717] mb-2">a quiet page</span>
                      <span className="font-sketch text-2xl text-[#71717a]">just write it down and let it go</span>
                    </div>
                  </button>
                  <button
                    onClick={startChat}
                    className="flex-1 flex flex-col items-center gap-6 p-10 bg-white border-[4px] border-[#171717] rounded-3xl shadow-[8px_8px_0px_#171717] hover:shadow-none hover:translate-y-[8px] hover:translate-x-[8px] transition-all group"
                  >
                    <MessageCircle size={64} strokeWidth={1.5} className="text-[#171717] group-hover:scale-110 transition-transform" />
                    <div className="text-center">
                      <span className="block font-sketch font-bold text-4xl text-[#171717] mb-2">a listening ear</span>
                      <span className="font-sketch text-2xl text-[#71717a]">talk to someone who understands</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3a: Journal */}
            {step === 'journal' && (
              <motion.div 
                key="journal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col p-6 md:p-12 notebook-lines bg-white"
              >
                {!journalSaved ? (
                  <>
                    <textarea
                      autoFocus
                      value={journalText}
                      onChange={(e) => setJournalText(e.target.value)}
                      placeholder="dear diary..."
                      className="flex-1 w-full max-w-4xl mx-auto bg-transparent text-[#171717] text-3xl md:text-4xl leading-[3rem] focus:outline-none font-sketch placeholder:text-[#a1a1aa] resize-none"
                    />
                    <div className="max-w-4xl mx-auto w-full flex justify-end mt-6">
                      <button
                        onClick={handleSaveJournal}
                        disabled={!journalText.trim()}
                        className="px-8 py-3 bg-[#171717] text-[#e5e5e5] border-[3px] border-[#171717] rounded-xl font-sketch font-bold text-2xl shadow-[4px_4px_0px_#71717a] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all disabled:opacity-50"
                      >
                        close the book
                      </button>
                    </div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
                  >
                    {/* Ocean background gradient */}
                    <div className="absolute inset-0" style={{
                      background: 'linear-gradient(180deg, #c5d5e4 0%, #9bb8cc 25%, #7ea3b8 50%, #6291a8 75%, #5a849a 100%)'
                    }} />

                    {/* Animated wave fills */}
                    {[
                      { bottom: 0, height: 120, dur: 7, opacity: 0.35, color: 'rgba(255,255,255,0.18)' },
                      { bottom: 20, height: 90, dur: 11, opacity: 0.3, color: 'rgba(255,255,255,0.12)' },
                      { bottom: 40, height: 70, dur: 9, opacity: 0.2, color: 'rgba(255,255,255,0.08)' },
                    ].map((w, i) => (
                      <div key={i} className="absolute left-0" style={{
                        bottom: w.bottom, width: '200%', height: w.height,
                        opacity: w.opacity,
                        animation: `oceanWave ${w.dur}s linear infinite`,
                      }}>
                        <svg width="100%" height="100%" viewBox="0 0 1200 100" preserveAspectRatio="none">
                          <path
                            d="M0,40 C60,20 120,60 180,40 C240,20 300,60 360,40 C420,20 480,60 540,40 C600,20 660,60 720,40 C780,20 840,60 900,40 C960,20 1020,60 1080,40 C1140,20 1200,60 1200,40 L1200,100 L0,100 Z"
                            fill={w.color}
                          />
                        </svg>
                      </div>
                    ))}

                    {/* Sketch-style wave strokes */}
                    <svg className="absolute bottom-0 left-0 right-0 h-48 opacity-20">
                      <path d="M0 30 Q50 15 100 30 T200 30 T300 30 T400 30 T500 30 T600 30 T700 30 T800 30 T900 30 T1000 30 T1100 30 T1200 30 T1300 30 T1440 30" fill="none" stroke="#2d4a5e" strokeWidth="2.5">
                        <animate attributeName="d" values="M0 30 Q50 15 100 30 T200 30 T300 30 T400 30 T500 30 T600 30 T700 30 T800 30;M0 22 Q50 37 100 22 T200 22 T300 22 T400 22 T500 22 T600 22 T700 22 T800 22;M0 30 Q50 15 100 30 T200 30 T300 30 T400 30 T500 30 T600 30 T700 30 T800 30" dur="4s" repeatCount="indefinite" />
                      </path>
                      <path d="M0 55 Q40 42 80 55 T160 55 T240 55 T320 55 T400 55 T480 55 T560 55 T640 55 T720 55 T800 55 T880 55 T960 55 T1040 55 T1120 55 T1200 55 T1280 55 T1440 55" fill="none" stroke="#2d4a5e" strokeWidth="1.8">
                        <animate attributeName="d" values="M0 55 Q40 42 80 55 T160 55 T240 55 T320 55 T400 55 T480 55 T560 55;M0 48 Q40 60 80 48 T160 48 T240 48 T320 48 T400 48 T480 48 T560 48;M0 55 Q40 42 80 55 T160 55 T240 55 T320 55 T400 55 T480 55 T560 55" dur="5.5s" repeatCount="indefinite" />
                      </path>
                      <path d="M0 75 Q35 65 70 75 T140 75 T210 75 T280 75 T350 75 T420 75 T490 75 T560 75 T630 75 T700 75 T770 75 T840 75 T910 75 T980 75 T1050 75 T1120 75 T1190 75 T1260 75 T1440 75" fill="none" stroke="#2d4a5e" strokeWidth="1.2">
                        <animate attributeName="d" values="M0 75 Q35 65 70 75 T140 75 T210 75 T280 75 T350 75 T420 75;M0 70 Q35 80 70 70 T140 70 T210 70 T280 70 T350 70 T420 70;M0 75 Q35 65 70 75 T140 75 T210 75 T280 75 T350 75 T420 75" dur="6s" repeatCount="indefinite" />
                      </path>
                    </svg>

                    {/* Foam highlights */}
                    <div className="absolute bottom-8 left-0 right-0 h-3 opacity-10" style={{
                      background: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.6) 40px, rgba(255,255,255,0.6) 60px)',
                      animation: 'oceanWave 14s linear infinite',
                      width: '200%',
                    }} />

                    {/* Drift bottle */}
                    <motion.div
                      initial={{ y: 0, x: 0, rotate: 0 }}
                      animate={bottleDrifting ? {
                        x: [0, 30, 80, 200, 500],
                        y: [0, -20, -10, -30, -60],
                        rotate: [0, 5, -3, 8, 15],
                        scale: [1, 1, 0.9, 0.7, 0.3],
                        opacity: [1, 1, 1, 0.8, 0],
                      } : {}}
                      transition={{ duration: 4, ease: "easeInOut" }}
                      className="relative z-10"
                    >
                      {/* Bottle SVG */}
                      <svg width="80" height="140" viewBox="0 0 80 140">
                        {/* Bottle body */}
                        <path d="M 25 40 Q 25 35 30 30 L 30 15 Q 30 10 35 10 L 45 10 Q 50 10 50 15 L 50 30 Q 55 35 55 40 L 58 110 Q 58 130 40 130 Q 22 130 22 110 Z"
                          fill="rgba(200,220,240,0.4)" stroke="#171717" strokeWidth="2.5" />
                        {/* Cork */}
                        <rect x="32" y="5" width="16" height="10" rx="3" fill="#d4a574" stroke="#171717" strokeWidth="2" />
                        {/* Paper inside */}
                        <rect x="30" y="55" width="20" height="50" rx="2" fill="white" stroke="#a1a1aa" strokeWidth="1" transform="rotate(8, 40, 80)" />
                        <line x1="33" y1="65" x2="47" y2="63" stroke="#a1a1aa" strokeWidth="0.8" />
                        <line x1="33" y1="72" x2="45" y2="70" stroke="#a1a1aa" strokeWidth="0.8" />
                        <line x1="33" y1="79" x2="46" y2="77" stroke="#a1a1aa" strokeWidth="0.8" />
                        {/* Light reflection */}
                        <path d="M 30 50 Q 32 70 30 90" fill="none" stroke="white" strokeWidth="2" opacity="0.5" />
                      </svg>
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl md:text-5xl font-sketch font-bold text-[#171717] text-center mt-8 z-10"
                    >
                      {bottleDrifting ? "drifting away..." : "sealing your thoughts..."}
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: bottleDrifting ? 1 : 0 }}
                      transition={{ delay: 1.5 }}
                      className="text-xl md:text-2xl font-sketch text-[#71717a] text-center mt-4 z-10"
                    >
                      may it find the shore it's meant for.
                    </motion.p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 3b: Chat */}
            {step === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col h-full"
              >
                <div className="flex-1 overflow-y-auto p-4 md:p-8 notebook-lines bg-white">
                  <div className="max-w-3xl mx-auto space-y-8 pb-4">
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-5 rounded-lg font-sketch text-2xl md:text-3xl leading-relaxed text-[#171717] bg-white border border-[#d4d4d8] ${
                            msg.role === 'user'
                              ? 'rounded-br-sm shadow-[2px_2px_6px_rgba(0,0,0,0.08)]'
                              : 'rounded-bl-sm shadow-[2px_2px_6px_rgba(0,0,0,0.08)]'
                          }`}
                          style={{
                            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #ededf0 31px, #ededf0 32px)',
                            backgroundPosition: '0 10px',
                          }}
                        >
                          <div className="text-[11px] font-sketch text-[#a1a1aa] mb-1 uppercase tracking-[0.15em]">
                            {msg.role === 'user' ? 'you' : 'listener'}
                          </div>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div
                          className="bg-white text-[#171717] border border-[#d4d4d8] p-5 rounded-lg rounded-bl-sm shadow-[2px_2px_6px_rgba(0,0,0,0.08)] font-sketch text-3xl flex items-center gap-2"
                          style={{
                            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #ededf0 31px, #ededf0 32px)',
                            backgroundPosition: '0 10px',
                          }}
                        >
                          <span className="animate-bounce">.</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="p-4 md:p-6 border-t-[4px] border-[#171717] bg-white">
                  <div className="max-w-3xl mx-auto flex gap-4">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      placeholder="write your thoughts here..."
                      className="flex-1 bg-[#f4f4f5] border-[3px] border-[#171717] rounded-2xl px-6 py-4 font-sketch text-3xl text-[#171717] placeholder:text-[#a1a1aa] focus:outline-none shadow-[4px_4px_0px_#171717] transition-all"
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={!input.trim() || isTyping}
                      className="bg-[#171717] text-[#e5e5e5] border-[3px] border-[#171717] rounded-2xl px-8 py-4 hover:bg-[#e5e5e5] hover:text-[#171717] disabled:opacity-50 transition-all shadow-[4px_4px_0px_#71717a] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px]"
                    >
                      <Send size={32} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
