import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Zap, Timer, Trophy, ShieldAlert, 
  MousePointer2, Target, Loader2, Sparkles,
  Bot, Users, Swords
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';

interface QuickPulseProps {
  onClose: () => void;
  onComplete: (performance: 'good' | 'medium' | 'bad') => void;
  isOnline: boolean;
  isAdmin: boolean;
  currentUser: any;
}

export const QuickPulse: React.FC<QuickPulseProps> = ({ onClose, onComplete, isOnline, isAdmin, currentUser }) => {
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'result'>('lobby');
  const [score, setScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targets, setTargets] = useState<{ id: number, x: number, y: number, size: number, type: 'normal' | 'gold' | 'hazard' }[]>([]);
  const [nextTargetId, setNextTargetId] = useState(1);
  const [multiplier, setMultiplier] = useState(1);
  const [lastResult, setLastResult] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const gameIntervalRef = useRef<any>(null);
  const botIntervalRef = useRef<any>(null);

  const spawnTarget = useCallback(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const padding = 60;
    
    const typeProb = Math.random();
    let type: 'normal' | 'gold' | 'hazard' = 'normal';
    if (typeProb > 0.9) type = 'gold';
    else if (typeProb > 0.75) type = 'hazard';

    const newTarget = {
      id: Math.random(),
      x: padding + Math.random() * (width - padding * 2),
      y: padding + Math.random() * (height - padding * 2),
      size: type === 'gold' ? 30 : type === 'hazard' ? 45 : 40,
      type
    };
    setTargets(prev => [...prev, newTarget]);
  }, []);

  const handleTargetClick = (target: any) => {
    if (gameState !== 'playing') return;

    if (target.type === 'hazard') {
      setScore(prev => Math.max(0, prev - 100));
      setMultiplier(1);
    } else {
      let points = target.type === 'gold' ? 150 : 50;
      setScore(prev => prev + (points * multiplier));
      setMultiplier(prev => Math.min(prev + 0.1, 5));
    }

    setTargets(prev => prev.filter(t => t.id !== target.id));
    spawnTarget();
  };

  const startGame = () => {
    setScore(0);
    setOpponentScore(0);
    setTimeLeft(30);
    setGameState('playing');
    setTargets([]);
    setMultiplier(1);
    
    // Initial spawn
    for (let i = 0; i < 5; i++) {
      spawnTarget();
    }

    gameIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(gameIntervalRef.current);
          if (botIntervalRef.current) clearInterval(botIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (!isOnline) {
      // Bot Logic: Randomly "clicks" at intervals
      botIntervalRef.current = setInterval(() => {
        setOpponentScore(prev => prev + (Math.random() > 0.3 ? 50 : 0));
      }, 800);
    }
  };

  useEffect(() => {
    if (timeLeft === 0 && gameState === 'playing') {
      setGameState('result');
      const result = score > opponentScore ? 'win' : score < opponentScore ? 'loss' : 'draw';
      setLastResult(result);
      
      const performance = result === 'win' ? 'good' : result === 'draw' ? 'medium' : 'bad';
      setTimeout(() => onComplete(performance), 5000);
    }
  }, [timeLeft, score, opponentScore, gameState, onComplete]);

  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    };
  }, []);

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col font-sans select-none overflow-hidden relative">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-transparent to-purple-900/10 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 h-16 md:h-20 bg-black/60 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-4">
           <div className="p-2 bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20">
              <Zap className="w-5 h-5 text-white" />
           </div>
           <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-black italic tracking-widest text-white leading-none uppercase">Quick Pulse</h1>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">{isOnline ? 'Network Protocol v1.2' : 'Synthetic Simulation v0.9'}</span>
           </div>
        </div>

        {gameState === 'playing' && (
          <div className="flex items-center gap-8 bg-white/5 px-6 py-2 rounded-2xl border border-white/10 shadow-inner">
             <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Timer</span>
                <div className={`text-xl font-black italic ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  0:{timeLeft.toString().padStart(2, '0')}
                </div>
             </div>
             <div className="w-px h-8 bg-white/10" />
             <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Combo</span>
                <div className="text-xl font-black italic text-cyan-400">x{multiplier.toFixed(1)}</div>
             </div>
          </div>
        )}

        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex">
        
        {/* Scoreboards */}
        {gameState === 'playing' && (
          <>
            <div className="absolute top-8 left-8 z-20 flex flex-col items-start">
               <div className="flex items-center gap-3 bg-blue-500 text-white px-5 py-2 rounded-xl shadow-lg shadow-blue-500/30">
                  <span className="text-xs font-black uppercase italic tracking-widest">YOU</span>
                  <span className="text-2xl font-black italic">{score}</span>
               </div>
            </div>
            <div className="absolute top-8 right-8 z-20 flex flex-col items-end">
               <div className="flex items-center gap-3 bg-red-500 text-white px-5 py-2 rounded-xl shadow-lg shadow-red-500/30">
                  <span className="text-2xl font-black italic">{opponentScore}</span>
                  <span className="text-xs font-black uppercase italic tracking-widest">{isOnline ? 'OPPONENT' : 'NEURAL BOT'}</span>
               </div>
            </div>
          </>
        )}

        {/* Game Arena */}
        <div ref={containerRef} className="flex-1 relative cursor-crosshair">
          <AnimatePresence>
            {gameState === 'lobby' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 flex items-center justify-center p-8 text-center"
              >
                 <div className="max-w-md w-full bg-black/40 backdrop-blur-2xl border border-white/10 p-12 rounded-[3.5rem] shadow-2xl">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-6">
                       <Swords className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-4xl font-black italic tracking-tighter text-white mb-4 uppercase">READY TO PULSE?</h2>
                    <p className="text-slate-400 font-medium mb-10 leading-relaxed">Click the pulse nodes as fast as possible. Golden nodes yield triple points. Avoid hazards.</p>
                    
                    <button 
                      onClick={startGame}
                      className="w-full py-5 bg-white text-black rounded-2xl font-black italic tracking-widest text-2xl hover:bg-slate-200 transition-all shadow-xl shadow-white/10 active:scale-95"
                    >
                      ENGAGE
                    </button>
                    
                    <div className="mt-8 flex items-center justify-center gap-6">
                       <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                          <Bot className="w-4 h-4" /> BOT_OPPONENT
                       </div>
                       <div className="w-px h-4 bg-white/10" />
                       <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                          <Zap className="w-4 h-4" /> 30S_TRIAL
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {gameState === 'playing' && targets.map(target => (
              <motion.button
                key={target.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                onMouseDown={() => handleTargetClick(target)}
                style={{ 
                  left: target.x, 
                  top: target.y,
                  width: target.size,
                  height: target.size
                }}
                className={`absolute rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-90
                  ${target.type === 'normal' ? 'bg-blue-500 shadow-blue-500/40 border-2 border-white/20' : 
                    target.type === 'gold' ? 'bg-yellow-400 shadow-yellow-400/40 border-4 border-white/30 animate-pulse' : 
                    'bg-red-500 shadow-red-500/40 border-2 border-black/50'}
                `}
              >
                {target.type === 'gold' ? <Sparkles className="w-4 h-4 text-white" /> : 
                 target.type === 'hazard' ? <ShieldAlert className="w-5 h-5 text-black" /> : 
                 <Target className="w-4 h-4 text-white opacity-40 shrink-0" />}
              </motion.button>
            ))}

            {gameState === 'result' && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 flex items-center justify-center p-8"
              >
                 <div className="bg-white text-black p-12 rounded-[4rem] text-center shadow-[0_0_100px_rgba(255,255,255,0.2)] max-w-lg w-full overflow-hidden relative">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                    
                    <h3 className="text-xs font-black uppercase tracking-[0.5em] text-slate-400 mb-2">Pulse Terminated</h3>
                    <h2 className="text-6xl font-black italic tracking-tighter uppercase mb-8">
                       {lastResult === 'win' ? 'VICTORY' : lastResult === 'loss' ? 'DEFEAT' : 'DRAW'}
                    </h2>

                    <div className="grid grid-cols-2 gap-4 mb-10">
                       <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Your Score</span>
                          <div className="text-4xl font-black italic text-blue-600">{score.toLocaleString()}</div>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-slate-400">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Opponent</span>
                          <div className="text-4xl font-black italic">{opponentScore.toLocaleString()}</div>
                       </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                       <div className="flex items-center gap-2 px-10 py-3 bg-black text-white rounded-2xl font-black italic uppercase tracking-widest text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Synchronizing Stats...
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer / Instructions */}
      <div className="relative z-10 h-10 bg-black/80 flex items-center justify-center border-t border-white/5">
         <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em]">Precision Reactivity Node // Sector Delta-7</span>
      </div>
    </div>
  );
};
