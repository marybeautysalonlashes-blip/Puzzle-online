import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Timer, Users, Swords, Crosshair, Zap, 
  Shield, Trophy, Bot, MessageSquare, Heart,
  Flame, Target, Radio, Power, AlertCircle, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CyberStrikeProps {
  onClose: () => void;
  onComplete: (performance: 'good' | 'medium' | 'bad') => void;
  isOnline: boolean;
  isAdmin?: boolean;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  type: 'drone' | 'turret' | 'core';
  health: number;
  speed: number;
}

export const CyberStrike: React.FC<CyberStrikeProps> = ({ onClose, onComplete, isOnline, isAdmin }) => {
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameOver, setIsGameOver] = useState(false);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [explosions, setExplosions] = useState<{x: number, y: number, id: number}[]>([]);
  const [wave, setWave] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const spawnInterval = setInterval(() => {
      if (!isGameOver) {
        spawnEnemy();
      }
    }, 1500 / (1 + wave * 0.2));

    const moveInterval = setInterval(() => {
      setEnemies(prev => prev.map(e => ({
        ...e,
        y: e.y + e.speed
      })).filter(e => {
        if (e.y > 100) {
          setHealth(h => Math.max(0, h - 10));
          return false;
        }
        return true;
      }));
    }, 50);

    return () => {
      clearInterval(timer);
      clearInterval(spawnInterval);
      clearInterval(moveInterval);
    };
  }, [wave, isGameOver]);

  useEffect(() => {
    if (health <= 0) finishGame();
  }, [health]);

  const spawnEnemy = () => {
    const newEnemy: Enemy = {
      id: Date.now(),
      x: Math.random() * 80 + 10,
      y: -10,
      type: Math.random() > 0.8 ? 'turret' : (Math.random() > 0.5 ? 'drone' : 'core'),
      health: 1,
      speed: Math.random() * 0.5 + 0.5 + (wave * 0.1)
    };
    setEnemies(prev => [...prev, newEnemy]);
  };

  const handleClick = (id: number, x: number, y: number) => {
    setEnemies(prev => prev.filter(e => e.id !== id));
    setScore(s => s + 10);
    setExplosions(prev => [...prev, { x, y, id: Date.now() }]);
    setTimeout(() => {
      setExplosions(prev => prev.filter(exp => exp.id !== Date.now()));
    }, 500);
    
    if (score > 100 * wave) {
      setWave(w => w + 1);
    }
  };

  const finishGame = () => {
    setIsGameOver(true);
    let perf: 'good' | 'medium' | 'bad' = 'medium';
    if (score >= 300) perf = 'good';
    else if (score < 100) perf = 'bad';
    setTimeout(() => onComplete(perf), 3000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col font-mono text-cyan-400 overflow-hidden">
      {/* HUD */}
      <div className="h-20 border-b border-red-500/30 px-8 flex items-center justify-between bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-red-500/50 font-black tracking-widest uppercase">Strike Protocol</span>
            <span className="text-2xl font-black text-white italic">NEON STRIKE <span className="text-xs text-red-500 font-normal ml-2">{isOnline ? 'MULTI' : 'SOLO'}</span></span>
          </div>
          <div className="h-10 w-px bg-white/10"></div>
          <div className="flex flex-col">
             <span className="text-[10px] opacity-50 uppercase">Wave</span>
             <span className="text-xl font-black text-red-500">{wave}</span>
          </div>
        </div>

        <div className="flex items-center gap-12">
          <div className="flex flex-col items-center">
             <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <span className="text-lg font-black">{health}%</span>
             </div>
             <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${health}%` }} className="h-full bg-red-500 shadow-[0_0_10px_red]" />
             </div>
          </div>
          
          <div className="flex flex-col items-end">
             <span className="text-[10px] opacity-50 uppercase">Total Score</span>
             <span className="text-3xl font-black text-cyan-400 tabular-nums">{score}</span>
          </div>

          {/* Admin Assist */}
          {isAdmin && (
            <div className="flex bg-white/5 backdrop-blur rounded-2xl p-1 border border-white/10 ml-4">
              <button 
                onClick={() => setHealth(100)}
                className="p-3 hover:bg-white/10 rounded-xl text-emerald-400" title="Full Repair"
              >
                <Heart className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setScore(prev => prev + 500)}
                className="p-3 hover:bg-white/10 rounded-xl text-blue-400" title="Mass Gain (+500)"
              >
                <Zap className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  setEnemies([]);
                  setWave(prev => prev + 1);
                }}
                className="p-3 hover:bg-white/10 rounded-xl text-purple-400" title="Next Wave"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          <button onClick={onClose} className="hover:bg-red-500 hover:text-black p-2 transition-colors rounded">
            <X className="w-8 h-8" />
          </button>
        </div>
      </div>

      {/* Combat Zone */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] overflow-hidden cursor-crosshair"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>

        {/* Enemies */}
        {enemies.map(enemy => (
          <motion.div
            key={enemy.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute p-4 -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}
            onMouseDown={() => handleClick(enemy.id, enemy.x, enemy.y)}
          >
            <div className={`relative w-16 h-16 flex items-center justify-center transition-transform hover:scale-110 active:scale-95`}>
               <div className={`absolute inset-0 rounded-full blur-xl opacity-30 ${enemy.type === 'turret' ? 'bg-red-500' : (enemy.type === 'drone' ? 'bg-orange-500' : 'bg-cyan-500')}`}></div>
               <div className={`relative z-10 p-3 rounded-lg border-2 bg-black/60 shadow-2xl ${enemy.type === 'turret' ? 'border-red-500 text-red-500' : (enemy.type === 'drone' ? 'border-orange-500 text-orange-500' : 'border-cyan-500 text-cyan-400')}`}>
                  {enemy.type === 'turret' && <Target className="w-8 h-8 animate-pulse" />}
                  {enemy.type === 'drone' && <Zap className="w-8 h-8" />}
                  {enemy.type === 'core' && <Radio className="w-8 h-8 animate-spin" />}
               </div>
               <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 bg-black rounded border border-white/20 text-[8px] font-bold uppercase tracking-tighter">
                 {enemy.type}
               </div>
            </div>
          </motion.div>
        ))}

        {/* Explosions */}
        {explosions.map(exp => (
          <motion.div
            key={exp.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${exp.x}%`, top: `${exp.y}%` }}
          >
            <div className="w-20 h-20 rounded-full bg-orange-500 blur-2xl"></div>
            <Flame className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-white" />
          </motion.div>
        ))}

        {/* Critical Alerts */}
        <AnimatePresence>
          {health < 30 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 pointer-events-none"
            >
               <AlertCircle className="w-20 h-20 text-red-500 animate-ping" />
               <div className="bg-red-500 text-black px-4 py-1 text-2xl font-black italic">CRITICAL SYSTEM DAMAGE</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="h-16 bg-black border-t border-white/5 flex items-center justify-between px-8">
        <div className="flex gap-8">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
              <span className="text-[10px] uppercase opacity-40">System Stabilized</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-[10px] uppercase opacity-40">Enemy count: {enemies.length}</span>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <Timer className="w-5 h-5 text-red-500" />
           <span className="text-3xl font-black text-white italic tabular-nums">{timeLeft}</span>
           <span className="text-[10px] uppercase text-red-500">Seconds Remaining</span>
        </div>
      </div>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80"
          >
             <div className="text-center space-y-12">
                <motion.div 
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="inline-block p-12 rounded-full bg-red-500/20 border border-red-500 shadow-[0_0_50px_red]"
                >
                   <Swords className="w-24 h-24 text-red-500" />
                </motion.div>
                <div className="space-y-2">
                   <h2 className="text-6xl font-black italic text-white tracking-widest uppercase">Operation Over</h2>
                   <p className="text-red-500 font-bold tracking-[0.4em]">SCORE SYNC IN PROGRESS...</p>
                </div>
                <div className="grid grid-cols-2 gap-8 max-w-sm mx-auto">
                   <div className="bg-black/80 p-6 rounded-2xl border border-red-500/30">
                      <div className="text-xs uppercase opacity-50 mb-2">Eliminations</div>
                      <div className="text-4xl font-black text-white italic">{score / 10}</div>
                   </div>
                   <div className="bg-black/80 p-6 rounded-2xl border border-red-500/30">
                      <div className="text-xs uppercase opacity-50 mb-2">Rewards</div>
                      <div className="text-4xl font-black text-cyan-400 italic">+{score}xp</div>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
