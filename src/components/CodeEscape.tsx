import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Timer, Users, MessageSquare, Lightbulb, Zap, 
  Lock, Unlock, Cpu, Layers, MousePointer2, Shuffle,
  Hash, Move, Key, Terminal, Wifi, WifiOff, Bot,
  Award, Swords, Ghost, EyeOff, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CodeEscapeProps {
  onClose: () => void;
  onComplete: (performance: 'good' | 'medium' | 'bad') => void;
  isOnline: boolean;
  isAdmin?: boolean;
}

type PuzzleType = 'CABLES' | 'SYMBOLS' | 'NUMBERS' | 'MAZE' | 'CODE';

export const CodeEscape: React.FC<CodeEscapeProps> = ({ onClose, onComplete, isOnline, isAdmin }) => {
  const [puzzleType, setPuzzleType] = useState<PuzzleType>('CABLES');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<{user: string, text: string}[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [players, setPlayers] = useState([
    { id: '1', name: 'You', score: 0, isBot: false },
    { id: '2', name: 'Dr. Hack', score: 0, isBot: true },
    { id: '3', name: 'Null_Ptr', score: 0, isBot: true },
    { id: '4', name: 'Cyber_Ghost', score: 0, isBot: true },
  ]);

  // Game Logic state
  const [cableLines, setCableLines] = useState<{id: number, start: number, end: number, currentEnd: number | null}[]>([]);
  const [symbolSequence, setSymbolSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [hackingGrid, setHackingGrid] = useState<number[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [mazePos, setMazePos] = useState({ x: 0, y: 0 });
  const [secretCode, setSecretCode] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [codeFeedback, setCodeFeedback] = useState('');

  useEffect(() => {
    initPuzzle();
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

    // Bot score simulation
    const botInterval = setInterval(() => {
      setPlayers(prev => prev.map(p => {
        if (p.isBot) {
          const gain = Math.random() > 0.7 ? 10 : 0;
          return { ...p, score: p.score + gain };
        }
        return p;
      }));
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(botInterval);
    };
  }, []);

  const initPuzzle = () => {
    const types: PuzzleType[] = ['CABLES', 'SYMBOLS', 'NUMBERS', 'MAZE', 'CODE'];
    const nextType = types[Math.floor(Math.random() * types.length)];
    setPuzzleType(nextType);
    setHintUsed(false);

    if (nextType === 'CABLES') {
      const ports = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      setCableLines([0, 1, 2, 3].map(i => ({ id: i, start: i, end: ports[i], currentEnd: null })));
    } else if (nextType === 'SYMBOLS') {
      const seq = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
      setSymbolSequence(seq);
      setUserSequence([]);
      setIsShowingSequence(true);
      setTimeout(() => setIsShowingSequence(false), 3000);
    } else if (nextType === 'NUMBERS') {
      const grid = Array.from({ length: 16 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
      setHackingGrid(grid);
      setNextNumber(1);
    } else if (nextType === 'MAZE') {
      setMazePos({ x: 0, y: 0 });
    } else if (nextType === 'CODE') {
      setSecretCode(Math.floor(1000 + Math.random() * 9000).toString());
      setGuessInput('');
      setCodeFeedback('ENTER 4-DIGIT CODE');
    }
  };

  const finishGame = () => {
    setIsGameOver(true);
    // Determine performance
    let perf: 'good' | 'medium' | 'bad' = 'medium';
    if (score >= 50) perf = 'good';
    else if (score < 20) perf = 'bad';
    
    setTimeout(() => onComplete(perf), 3000);
  };

  const handlePuzzleSubmited = () => {
    setScore(prev => prev + 10);
    setPlayers(prev => prev.map(p => p.name === 'You' ? { ...p, score: p.score + 10 } : p));
    initPuzzle();
  };

  // Puzzle Actions
  const handleCableConnect = (id: number, portId: number) => {
    setCableLines(prev => prev.map(l => l.id === id ? { ...l, currentEnd: portId } : l));
    const allDone = cableLines.every(l => l.id === id ? portId === l.end : l.currentEnd === l.end);
    if (allDone) handlePuzzleSubmited();
  };

  const handleSymbolClick = (idx: number) => {
    if (isShowingSequence) return;
    const nextSeq = [...userSequence, idx];
    setUserSequence(nextSeq);
    if (nextSeq[nextSeq.length - 1] !== symbolSequence[nextSeq.length - 1]) {
      setUserSequence([]);
      setIsShowingSequence(true);
      setTimeout(() => setIsShowingSequence(false), 2000);
      return;
    }
    if (nextSeq.length === symbolSequence.length) handlePuzzleSubmited();
  };

  const handleNumberClick = (num: number) => {
    if (num === nextNumber) {
      if (num === 16) handlePuzzleSubmited();
      else setNextNumber(prev => prev + 1);
    }
  };

  const handleMazeMove = (dx: number, dy: number) => {
    const nextX = Math.max(0, Math.min(4, mazePos.x + dx));
    const nextY = Math.max(0, Math.min(4, mazePos.y + dy));
    setMazePos({ x: nextX, y: nextY });
    if (nextX === 4 && nextY === 4) handlePuzzleSubmited();
  };

  const handleCodeGuess = () => {
    if (guessInput === secretCode) handlePuzzleSubmited();
    else {
      let correct = 0;
      for (let i = 0; i < 4; i++) if (guessInput[i] === secretCode[i]) correct++;
      setCodeFeedback(`${correct} DIGITS CORRECT`);
      setGuessInput('');
    }
  };

  const sendObstacle = (type: string) => {
    if (score < 5) return;
    setScore(prev => prev - 5);
    // In real multiplayer we'd send to others. Here just fake interaction
    setChatMessages(prev => [{ user: 'System', text: `Deployed ${type} to enemies!` }, ...prev]);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col font-mono text-cyan-400 overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-cyan-500/30 px-6 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-4">
          <Terminal className="w-6 h-6" />
          <span className="text-xl font-black tracking-widest uppercase">Code Escape <span className="text-[10px] text-cyan-500/50">v2.0.4 - {isOnline ? 'ONLINE' : 'SOLO'}</span></span>
        </div>
        <div className="flex items-center gap-8">
          <button 
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1 rounded border border-cyan-500/30 text-[10px] font-bold"
          >
            <Lightbulb className="w-3 h-3" /> HOW TO PLAY
          </button>
          <div className="flex items-center gap-2 bg-red-500/10 px-4 py-1 rounded-full border border-red-500/30">
            <Timer className="w-4 h-4 text-red-500" />
            <span className="text-lg font-bold text-red-500">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>

          {/* Admin Assist Quick Bar */}
          {isAdmin && (
            <div className="flex bg-white/10 backdrop-blur rounded-lg p-1 border border-white/10 ml-4 animate-pulse">
              <button 
                onClick={() => setTimeLeft(prev => prev + 30)}
                className="p-1 hover:bg-white/10 rounded text-emerald-400" title="Add Time (+30s)"
              >
                <Zap className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  setScore(prev => prev + 50);
                  initPuzzle();
                }}
                className="p-1 hover:bg-white/10 rounded text-blue-400" title="Skip Level (+50 PTS)"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
          )}

          <button onClick={onClose} className="hover:bg-cyan-500 hover:text-black p-2 transition rounded">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence>
          {showTutorial && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-8 flex flex-col items-center justify-center overflow-y-auto"
            >
              <div className="max-w-3xl w-full bg-cyan-950/20 border border-cyan-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black italic tracking-widest text-cyan-400">MISSION BRIEFING</h3>
                  <button onClick={() => setShowTutorial(false)} className="bg-cyan-500 text-black px-6 py-2 rounded font-black tracking-widest hover:bg-cyan-400">READY</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div className="flex gap-4">
                         <div className="w-10 h-10 bg-cyan-500/20 rounded flex items-center justify-center shrink-0 border border-cyan-500/40">
                            <Zap className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="font-bold text-sm mb-1 uppercase tracking-wider">Objective</div>
                            <p className="text-xs text-white/60 leading-relaxed font-sans">Resolve as many puzzles as possible before time runs out. Each performance (Good/Medium/Bad) awards XP and up to 500 Coins.</p>
                         </div>
                      </div>

                      <div className="flex gap-4">
                         <div className="w-10 h-10 bg-cyan-500/20 rounded flex items-center justify-center shrink-0 border border-cyan-500/40">
                            <Bot className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="font-bold text-sm mb-1 uppercase tracking-wider">Opponents</div>
                            <p className="text-xs text-white/60 leading-relaxed font-sans">You are competing against AI bots. Their scores are tracked on the left panel. Finish top #1 for maximum bonus.</p>
                         </div>
                      </div>

                      <div className="flex gap-4">
                         <div className="w-10 h-10 bg-cyan-500/20 rounded flex items-center justify-center shrink-0 border border-cyan-500/40">
                            <EyeOff className="w-6 h-6 text-red-500" />
                         </div>
                         <div>
                            <div className="font-bold text-sm mb-1 uppercase tracking-wider text-red-500">Sabotage</div>
                            <p className="text-xs text-white/60 leading-relaxed font-sans">Use buttons at the bottom to send obstacles. They cost points but can slow down others in multiplayer.</p>
                         </div>
                      </div>
                   </div>

                   <div className="bg-black/40 border border-cyan-500/10 p-6 rounded-xl">
                      <h4 className="text-[10px] font-black tracking-[0.2em] mb-4 text-cyan-500/50 uppercase">Puzzle Directory</h4>
                      <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <Terminal className="w-4 h-4 opacity-50" />
                            <span className="text-[10px]">CABLES: Connect left ports to matching right ports.</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <Layers className="w-4 h-4 opacity-50" />
                            <span className="text-[10px]">MEMORY: Watch the sequence and repeat exactly.</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 opacity-50" />
                            <span className="text-[10px]">NUMBERS: Click numbers 1 to 16 in order.</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <Move className="w-4 h-4 opacity-50" />
                            <span className="text-[10px]">MAZE: Navigate the cursor to the green exit.</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <Key className="w-4 h-4 opacity-50" />
                            <span className="text-[10px]">CODE: Guess the 4-digit code using logic feedback.</span>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left: Players */}
        <div className="w-64 border-r border-cyan-500/20 bg-cyan-950/20 flex flex-col">
          <div className="p-4 border-b border-cyan-500/20 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-500/70">
            <Users className="w-4 h-4" /> Room Data
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {players.sort((a,b) => b.score - a.score).map((p, idx) => (
              <div key={p.id} className={`p-3 rounded-lg border transition-all duration-300 ${p.name === 'You' ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-black/40 border-cyan-500/10'}`}>
                <div className="flex justify-between items-center mb-1">
                   <span className="text-xs font-bold flex items-center gap-1">
                     {idx === 0 && <Award className="w-3 h-3 text-yellow-500" />}
                     {p.name}
                   </span>
                   <span className="text-[10px] text-cyan-500/50">#{idx + 1}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xl font-black text-white">{p.score}</span>
                  <span className="text-[10px] uppercase opacity-50">PTS</span>
                </div>
                <div className="w-full h-1 bg-black/50 rounded-full mt-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(p.score, 100)}%` }}
                    className="h-full bg-cyan-500" 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Main Game */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-8 bg-[url(https://www.transparenttextures.com/patterns/carbon-fibre.png)]">
          <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none"></div>
          
          <AnimatePresence mode="wait">
            {!isGameOver ? (
              <motion.div 
                key={puzzleType}
                initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="relative w-full max-w-2xl aspect-[4/3] bg-black/80 rounded-2xl border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
                    <span className="text-sm uppercase tracking-[0.3em] font-black">Protocol: {puzzleType}</span>
                  </div>
                  <div className="text-[10px] text-cyan-500/30 uppercase">System Check: OK</div>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  {puzzleType === 'CABLES' && (
                    <div className="w-full grid grid-cols-2 gap-12 px-12">
                      <div className="space-y-8">
                        {cableLines.map(line => (
                          <div key={line.id} className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full border-2 ${line.currentEnd !== null ? 'bg-cyan-500 border-cyan-300' : 'bg-cyan-950 border-cyan-500/30'} flex items-center justify-center text-xs font-bold`}>{line.id}</div>
                            <div className="flex-1 h-0.5 bg-cyan-500/20 relative cursor-pointer group" onClick={() => handleCableConnect(line.id, 0)}>
                               <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ${line.currentEnd === 0 ? 'bg-cyan-500 shadow-[0_0_10px_cyan]' : 'bg-cyan-500/20'}`}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-8">
                         {[0,1,2,3].map(i => (
                           <div key={i} className="flex items-center gap-4 justify-end">
                              <button 
                                onClick={() => {
                                  const selected = cableLines.find(l => l.currentEnd === null);
                                  if (selected) handleCableConnect(selected.id, i);
                                }}
                                className="w-12 h-8 bg-black/60 border border-cyan-500/30 rounded flex items-center justify-center hover:bg-cyan-500 hover:text-black transition"
                              >
                                {i}
                              </button>
                              <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 bg-cyan-950"></div>
                           </div>
                         ))}
                      </div>
                      <div className="col-span-2 text-center text-xs mt-4 opacity-50 uppercase">Connect sequential bits to open ports</div>
                    </div>
                  )}

                  {puzzleType === 'SYMBOLS' && (
                    <div className="grid grid-cols-2 gap-6 p-4">
                      {[0, 1, 2, 3].map(i => (
                        <motion.button 
                          key={i}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSymbolClick(i)}
                          className={`w-32 h-32 rounded-xl border flex items-center justify-center transition-all duration-300 ${
                            isShowingSequence && symbolSequence[userSequence.length] === i 
                              ? 'bg-cyan-500 border-white text-black shadow-[0_0_30px_cyan]' 
                              : 'bg-black/60 border-cyan-500/30 hover:border-cyan-500'
                          }`}
                        >
                          {i === 0 && <Shuffle className="w-10 h-10" />}
                          {i === 1 && <Cpu className="w-10 h-10" />}
                          {i === 2 && <Layers className="w-10 h-10" />}
                          {i === 3 && <Zap className="w-10 h-10" />}
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {puzzleType === 'NUMBERS' && (
                    <div className="grid grid-cols-4 gap-3">
                      {hackingGrid.map((num, i) => (
                        <button 
                          key={i}
                          onClick={() => handleNumberClick(num)}
                          disabled={num < nextNumber}
                          className={`w-14 h-14 md:w-20 md:h-20 rounded border flex items-center justify-center font-black text-xl transition-all duration-200 ${num < nextNumber ? 'bg-cyan-500/10 border-cyan-500/10 text-cyan-500/20' : 'bg-black/60 border-cyan-500/40 hover:bg-cyan-500 hover:text-black shadow-[0_0_10px_rgba(6,182,212,0.1)]'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  )}

                  {puzzleType === 'MAZE' && (
                    <div className="flex flex-col items-center gap-8">
                      <div className="grid grid-cols-5 gap-2 p-2 bg-black/40 rounded-lg border border-cyan-500/20">
                        {Array.from({ length: 25 }).map((_, i) => {
                          const x = i % 5;
                          const y = Math.floor(i / 5);
                          const isPlayer = y === mazePos.y && x === mazePos.x;
                          const isTarget = y === 4 && x === 4;
                          return (
                            <div key={i} className={`w-10 h-10 md:w-16 md:h-16 rounded flex items-center justify-center border ${isPlayer ? 'bg-cyan-500 border-cyan-300 shadow-[0_0_15px_cyan]' : isTarget ? 'bg-emerald-500/20 border-emerald-500/50 animate-pulse' : 'bg-cyan-950/10 border-cyan-500/10'}`}>
                               {isPlayer && <MousePointer2 className="text-black w-6 h-6" />}
                               {isTarget && <Swords className="text-emerald-500 w-6 h-6" />}
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div></div>
                        <button onClick={() => handleMazeMove(0, -1)} className="p-4 bg-cyan-500/20 border border-cyan-500/40 rounded hover:bg-cyan-500 hover:text-black">↑</button>
                        <div></div>
                        <button onClick={() => handleMazeMove(-1, 0)} className="p-4 bg-cyan-500/20 border border-cyan-500/40 rounded hover:bg-cyan-500 hover:text-black">←</button>
                        <button onClick={() => handleMazeMove(0, 1)} className="p-4 bg-cyan-500/20 border border-cyan-500/40 rounded hover:bg-cyan-500 hover:text-black">↓</button>
                        <button onClick={() => handleMazeMove(1, 0)} className="p-4 bg-cyan-500/20 border border-cyan-500/40 rounded hover:bg-cyan-500 hover:text-black">→</button>
                      </div>
                    </div>
                  )}

                  {puzzleType === 'CODE' && (
                    <div className="flex flex-col items-center gap-8">
                      <div className="text-4xl font-black tracking-[0.5em] bg-cyan-500/10 px-8 py-4 rounded border border-cyan-500/40 min-w-[200px] text-center shadow-inner">
                        {guessInput.padEnd(4, '_')}
                      </div>
                      <div className="text-xs font-bold tracking-widest text-cyan-500/50 uppercase">{codeFeedback}</div>
                      <div className="grid grid-cols-3 gap-3">
                        {[1,2,3,4,5,6,7,8,9,0].map(n => (
                          <button 
                            key={n} 
                            onClick={() => guessInput.length < 4 && setGuessInput(prev => prev + n)}
                            className="w-16 h-12 bg-black/60 border border-cyan-500/30 rounded font-bold hover:bg-cyan-500 hover:text-black transition"
                          >
                            {n}
                          </button>
                        ))}
                        <button onClick={() => setGuessInput('')} className="bg-red-500/20 border border-red-500/40 text-red-500 rounded col-span-2">RESET</button>
                        <button 
                          onClick={handleCodeGuess}
                          disabled={guessInput.length < 4}
                          className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 rounded font-bold hover:bg-emerald-500 hover:text-black transition"
                        >
                          EXE
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-4 h-1 items-center">
                  <div className="text-[10px] uppercase font-bold tracking-widest opacity-30">Progress</div>
                  <div className="flex-1 h-full bg-cyan-500/10 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(score % 10) * 10}%` }}
                        className="h-full bg-cyan-500"
                     />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8"
              >
                <div className="inline-flex items-center justify-center p-8 bg-cyan-500 rounded-full shadow-[0_0_50px_cyan]">
                   <Lock className="w-16 h-16 text-black" />
                </div>
                <div>
                  <h2 className="text-4xl font-black italic tracking-widest text-white">ACCESS DENIED</h2>
                  <p className="text-cyan-500/60 font-bold tracking-[0.2em] mt-2">ENCRYPTION RE-ESTABLISHED</p>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left">
                   <div className="bg-black/50 p-4 border border-cyan-500/20 rounded">
                      <div className="text-[10px] uppercase opacity-50 mb-1">Final Score</div>
                      <div className="text-2xl font-black">{score}</div>
                   </div>
                   <div className="bg-black/50 p-4 border border-cyan-500/20 rounded">
                      <div className="text-[10px] uppercase opacity-50 mb-1">Level Gain</div>
                      <div className="text-2xl font-black font-mono">+{(score * 1.5).toFixed(0)}%</div>
                   </div>
                </div>
                <div className="animate-pulse text-cyan-500 font-bold tracking-widest">SYNCING WITH MASTER DATABASE...</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Actions */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
            <button 
              onClick={() => sendObstacle('BLOCK_VISION')}
              disabled={score < 10}
              className="px-6 py-2 bg-red-500/10 border border-red-500/40 text-red-500 hover:bg-red-500 hover:text-black transition rounded-full flex items-center gap-2 text-xs font-black"
            >
              <EyeOff className="w-4 h-4" /> DARK_VIS (10)
            </button>
            <button 
              onClick={() => sendObstacle('INVERT_CONTROLS')}
              disabled={score < 15}
              className="px-6 py-2 bg-orange-500/10 border border-orange-500/40 text-orange-500 hover:bg-orange-500 hover:text-black transition rounded-full flex items-center gap-2 text-xs font-black"
            >
              <RefreshCw className="w-4 h-4" /> INV_CONT (15)
            </button>
            <button 
              onClick={() => sendObstacle('FAKE_HINT')}
              disabled={score < 5}
              className="px-6 py-2 bg-yellow-500/10 border border-yellow-500/40 text-yellow-500 hover:bg-yellow-500 hover:text-black transition rounded-full flex items-center gap-2 text-xs font-black"
            >
              <Ghost className="w-4 h-4" /> GHOST_HINT (5)
            </button>
          </div>
        </div>

        {/* Right: Chat & Hints */}
        <div className="w-72 border-l border-cyan-500/20 bg-cyan-950/20 flex flex-col">
          <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-cyan-500/70">
            <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comms</div>
            <div className="flex items-center gap-1"><Wifi className="w-3 h-3 text-emerald-500 animate-pulse" /> <span className="text-[9px]">SECURE</span></div>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
             <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
                {chatMessages.map((m, i) => (
                  <div key={i} className="animate-in slide-in-from-right-4 duration-300">
                    <span className="text-cyan-600">[{m.user}]:</span> <span className="text-white/80">{m.text}</span>
                  </div>
                ))}
                <div className="opacity-40 animate-pulse">Waiting for incoming transmission...</div>
             </div>
             
             <div className="p-4 border-t border-cyan-500/20 space-y-4">
                <button 
                  onClick={() => {
                    if (score >= 5) {
                      setScore(prev => prev - 5);
                      setHintUsed(true);
                      setChatMessages(prev => [{ user: 'AI', text: puzzleType === 'CODE' ? `Starts with ${secretCode[0]}` : 'Try a different sequence!' }, ...prev]);
                    }
                  }}
                  className="w-full py-3 bg-emerald-500/10 border border-emerald-500/40 text-emerald-500 rounded font-black text-xs hover:bg-emerald-500 hover:text-black transition flex items-center justify-center gap-2"
                >
                  <Lightbulb className="w-4 h-4" /> REQEUST_HINT (5)
                </button>
                
                <div className="grid grid-cols-3 gap-1">
                   {['HACK','GL','NOOB'].map(msg => (
                     <button key={msg} onClick={() => setChatMessages(prev => [{ user: 'You', text: msg }, ...prev])} className="bg-white/5 border border-white/10 p-1 text-[9px] hover:bg-white/10 uppercase">{msg}</button>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
