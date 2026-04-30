import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Terminal, Shield, Users, Power, Lock, Unlock, 
  MessageSquare, UserMinus, UserPlus, Coins, 
  Settings, X, Search, ChevronRight, AlertTriangle,
  Zap, Eye, Globe, Database, Command, BookOpen,
  VolumeX, Volume2, Edit3, Save, Trash2, History,
  BadgeCheck, Info, HelpCircle, Activity, Server, FileJson
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { 
  collection, query, getDocs, updateDoc, doc, 
  setDoc, deleteDoc, onSnapshot, serverTimestamp,
  where, addDoc
} from 'firebase/firestore';

interface AdminPanelProps {
  onClose: () => void;
  adminUid: string;
}

interface UserProfile {
  userId: string;
  username: string;
  email?: string;
  isVerified?: boolean;
  isBanned?: boolean;
  banReason?: string;
  isMuted?: boolean;
  coins?: number;
  level?: number;
  xp?: number;
  warnings?: string[];
  tempBanUntil?: number;
  role?: 'player' | 'moderator' | 'admin';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, adminUid }) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'users' | 'system' | 'raw' | 'logs'>('terminal');
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'error' | 'success'}[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGlobalShutdown, setIsGlobalShutdown] = useState(false);
  const [infrastructure, setInfrastructure] = useState<any>({
    shopEnabled: true,
    activeGameModes: ['Default Game', 'Code Escape', 'Cyber Strike']
  });
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adminUid) return;

    const configRef = doc(db, 'config', 'global');
    const unsubConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsGlobalShutdown(data.isShutdown || false);
        setInfrastructure({
          shopEnabled: data.shopEnabled ?? true,
          activeGameModes: data.activeGameModes ?? ['Default Game', 'Code Escape', 'Cyber Strike']
        });
      }
    });

    const usersRef = collection(db, 'users');
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
      const users = snapshot.docs.map(d => ({...d.data(), userId: d.id}) as UserProfile);
      setAllUsers(users);
    });

    return () => {
      unsubConfig();
      unsubUsers();
    };
  }, [adminUid]);

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev.slice(-49), { msg, type }]);
    setTimeout(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, 100);
  };

  const executeCommand = async (cmdString: string) => {
    const args = cmdString.trim().split(' ');
    const baseCmd = args[0].toLowerCase();
    const [target, val1, val2] = [args[1], args[2], args[3]];
    
    addLog(`> ${cmdString}`, 'info');

    try {
      const userObj = target ? allUsers.find(u => u.username.toLowerCase() === target.toLowerCase()) : null;

      switch (baseCmd) {
        case '/help':
          addLog('Commands: /ban, /unban, /mute, /unmute, /setcoins <user> <amt>, /addcoins <user> <amt>, /removecoins <user> <amt>, /setlevel <user> <lv>, /addxp <user> <amt>, /shutdown, /startup, /broadcast <msg>, /announce <user|all> <msg>, /kick <user> <reason>, /tempban <user> <mins> <reason>, /warn <user> <reason>, /clearwarns <user>, /viewprofile <user>, /resetprogress <user>');
          break;
        case '/broadcast': {
            const msg = args.slice(1).join(' ');
            if (msg) {
                await addDoc(collection(db, 'global_chat'), { userId: adminUid, username: 'SYSTEM AUTHORITY', msg: msg.toUpperCase(), isVerified: true, isAlert: true, createdAt: serverTimestamp() });
                addLog(`Global transmission sent.`, 'success');
            }
            break;
        }
        case '/announce': {
            const [target, ...msgParts] = args.slice(1);
            const msg = msgParts.join(' ');
            if (!target || !msg) {
                addLog('Usage: /announce <user|all> <message>', 'error');
                break;
            }
            const userId = target === 'all' ? 'broadcast' : (allUsers.find(u => u.username.toLowerCase() === target.toLowerCase())?.userId);
            if (!userId) {
                addLog(`User ${target} not found.`, 'error');
                break;
            }
            await addDoc(collection(db, 'announcements'), {
                userId,
                message: msg,
                createdAt: serverTimestamp()
            });
            addLog(`Announcement sent to ${target}.`, 'success');
            break;
        }
        case '/shutdown':
        case '/startup':
          await setDoc(doc(db, 'config', 'global'), { isShutdown: baseCmd === '/shutdown' }, { merge: true });
          addLog(`Systems ${baseCmd === '/shutdown' ? 'SHUTDOWN' : 'RESTORED'}`, 'success');
          break;
        case '/ban':
        case '/unban':
        case '/mute':
        case '/unmute':
        case '/verify':
        case '/kick':
        case '/warn':
        case '/clearwarns':
        case '/tempban': {
            if (!userObj) return addLog(`User ${target} not found.`, 'error');
            
            if (baseCmd === '/kick') {
                await addDoc(collection(db, 'logs'), { userId: userObj.userId, action: 'kick', reason: args.slice(2).join(' '), timestamp: serverTimestamp() });
                addLog(`User ${target} kicked.`, 'success');
            } else if (baseCmd === '/warn') {
                await updateDoc(doc(db, 'users', userObj.userId), { warnings: [...(userObj.warnings || []), args.slice(2).join(' ')] });
                addLog(`Warned ${target}.`, 'success');
            } else if (baseCmd === '/clearwarns') {
                await updateDoc(doc(db, 'users', userObj.userId), { warnings: [] });
                addLog(`Cleared warnings for ${target}.`, 'success');
            } else if (baseCmd === '/tempban') {
                const mins = parseInt(args[2]);
                if (isNaN(mins)) return addLog('Invalid duration.', 'error');
                await updateDoc(doc(db, 'users', userObj.userId), { tempBanUntil: Date.now() + mins * 60000, reason: args.slice(3).join(' ') });
                addLog(`Temp banned ${target} for ${mins} mins.`, 'success');
            } else {
                let field = 'isBanned';
                let value = true;
                let reasonField = 'banReason';
                if (baseCmd === '/ban') { field = 'isBanned'; value = true; }
                else if (baseCmd === '/unban') { field = 'isBanned'; value = false; }
                else if (baseCmd === '/mute') { field = 'isMuted'; value = true; }
                else if (baseCmd === '/unmute') { field = 'isMuted'; value = false; }
                else if (baseCmd === '/verify') { field = 'isVerified'; value = true; }
                
                const updateData: any = { [field]: value };
                if (baseCmd === '/ban') updateData[reasonField] = args.slice(2).join(' ');
                
                await updateDoc(doc(db, 'users', userObj.userId), updateData);
                addLog(`Updated ${target} for ${baseCmd}.`, 'success');
            }
            break;
        }
        case '/setcoins':
        case '/addcoins':
        case '/removecoins':
        case '/setlevel':
        case '/addxp':
        case '/resetprogress': {
            if (!userObj) return addLog(`User ${target} not found.`, 'error');
            
            if (baseCmd === '/resetprogress') {
                await updateDoc(doc(db, 'users', userObj.userId), { coins: 0, level: 1, xp: 0, warnings: [], tempBanUntil: null });
                addLog(`Reset progress for ${target}.`, 'success');
                break;
            }

            const amount = parseInt(val1);
            if (isNaN(amount)) return addLog('Invalid numeric value.', 'error');
            
            const field = baseCmd.includes('coins') ? 'coins' : baseCmd.includes('level') ? 'level' : 'xp';
            let newVal = amount;
            if (baseCmd === '/addcoins') newVal = (userObj[field as keyof UserProfile] as number || 0) + amount;
            else if (baseCmd === '/addxp') newVal = (userObj[field as keyof UserProfile] as number || 0) + amount;
            else if (baseCmd === '/removecoins') newVal = Math.max(0, (userObj.coins || 0) - amount);
            
            await updateDoc(doc(db, 'users', userObj.userId), { [field]: newVal });
            addLog(`Updated ${field} for ${target} to ${newVal}.`, 'success');
            break;
        }
        case '/viewprofile':
            if(!userObj) return addLog(`User ${target} not found.`, 'error');
            addLog(`Profile for ${target}: Coins: ${userObj.coins}, Lvl: ${userObj.level}, XP: ${userObj.xp}, Warnings: ${userObj.warnings?.length || 0}`, 'info');
            break;
        default:
          addLog(`Sequence "${baseCmd}" not recognized.`, 'error');
      }
    } catch (err) {
      addLog(`Execution error: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const saveUserEdits = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.userId), {
        coins: editingUser.coins || 0,
        level: editingUser.level || 1,
        isVerified: editingUser.isVerified ?? false,
        isBanned: editingUser.isBanned ?? false,
        isMuted: editingUser.isMuted ?? false,
        role: editingUser.role || 'player'
      });
      addLog(`Saved changes for ${editingUser.username}`, 'success');
      setEditingUser(null);
    } catch (err: any) {
      addLog(`Failed to save user: ${err.message}`, 'error');
    }
  };

  const filteredUsers = useMemo(() => allUsers
    .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b.level || 0) - (a.level || 0)), [allUsers, searchQuery]);

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] text-slate-300 font-sans flex overflow-hidden">
      {/* Sidebar Navigation (Bento) */}
      <div className="w-64 border-r border-white/10 flex flex-col p-6 gap-6">
         <div className="text-white text-lg font-black tracking-tighter uppercase flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-500"/> AUTHORITY.IO
         </div>
         
         <div className="flex-1 space-y-2">
           {[
             { id: 'terminal', icon: Terminal, label: 'Terminal' },
             { id: 'users', icon: Users, label: 'User Registry' },
             { id: 'system', icon: Settings, label: 'Systems' },
             { id: 'raw', icon: FileJson, label: 'Raw Inspector' }
           ].map(tab => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-white/10 text-white border border-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
             >
               <tab.icon className="w-4 h-4" />
               <span className="text-xs font-bold uppercase tracking-widest">{tab.label}</span>
             </button>
           ))}
         </div>

         <button onClick={onClose} className="p-4 rounded-2xl bg-white/5 text-slate-400 hover:text-white text-xs font-bold uppercase flex items-center gap-2">
           <X className="w-4 h-4" /> TERMINATE SESSION
         </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-10">
           <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              ACTIVE_MAINFRAME_PATH: /ADMIN/{activeTab.toUpperCase()}
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10">
           {activeTab === 'terminal' && (
              <div className="h-full flex flex-col bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/5">
                <div className="flex-1 p-6 font-mono text-sm text-slate-400 space-y-2 overflow-y-auto" ref={terminalRef}>
                   {logs.map((log, i) => (
                      <div key={i} className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : ''}>
                         <span>[{new Date().toLocaleTimeString()}]</span> {log.msg}
                      </div>
                   ))}
                </div>
                <input 
                   value={command} 
                   onChange={(e) => setCommand(e.target.value)}
                   onKeyDown={(e) => {
                      if(e.key === 'Enter') { executeCommand(command); setCommand(''); }
                   }}
                   className="w-full bg-black border-t border-white/10 p-6 font-mono text-white outline-none"
                   placeholder="> _ROOT_COMMAND_..."
                />
              </div>
           )}
           
           {activeTab === 'users' && (
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredUsers.map(u => (
                  <div key={u.userId} className="bg-white/5 rounded-3xl p-6 border border-white/10 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-12 h-12 rounded-full" />
                        <div>
                           <div className="font-bold text-white uppercase tracking-tighter">{u.username}</div>
                           <div className="text-[10px] font-mono text-slate-500">{u.userId}</div>
                        </div>
                     </div>
                     <button onClick={() => setEditingUser(u)} className="px-4 py-2 bg-emerald-500/20 text-emerald-400 font-bold rounded-lg text-xs uppercase hover:bg-emerald-500 hover:text-white">MODIFY</button>
                  </div>
                ))}
             </div>
           )}
           
           {activeTab === 'raw' && (
             <div className="bg-[#0a0a0a] p-8 rounded-3xl text-xs font-mono text-emerald-500 overflow-x-auto">
                <pre>{JSON.stringify(allUsers, null, 2)}</pre>
             </div>
           )}
        </main>
      </div>

       {/* Edit Modal */}
       {editingUser && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-10">
          <div className="bg-[#111] border border-white/20 p-10 rounded-3xl w-full max-w-lg">
             <h2 className="text-white text-2xl font-black mb-6">MODIFY: {editingUser.username.toUpperCase()}</h2>
             <div className="space-y-4">
               <input type="number" value={editingUser.coins} onChange={e => setEditingUser({...editingUser, coins: parseInt(e.target.value)})} placeholder="Coins" className="w-full p-4 bg-white/5 rounded-xl text-white outline-none"/>
               <input type="number" value={editingUser.level} onChange={e => setEditingUser({...editingUser, level: parseInt(e.target.value)})} placeholder="Level" className="w-full p-4 bg-white/5 rounded-xl text-white outline-none"/>
               <select value={editingUser.role || 'player'} onChange={e => setEditingUser({...editingUser, role: e.target.value as 'player' | 'moderator' | 'admin'})} className="w-full p-4 bg-white/5 rounded-xl text-white outline-none">
                 <option value="player">PLAYER</option>
                 <option value="moderator">MODERATOR</option>
                 <option value="admin">ADMIN</option>
               </select>
               {['isVerified', 'isBanned', 'isMuted'].map(field => (
                <label key={field} className="flex items-center gap-3 text-white">
                  <input type="checkbox" checked={!!(editingUser as any)[field]} onChange={e => setEditingUser({...editingUser, [field]: e.target.checked})}/>
                  {field.toUpperCase()}
                </label>
               ))}
             </div>
             <div className="flex gap-4 mt-8">
               <button onClick={() => setEditingUser(null)} className="flex-1 py-4 bg-white/10 rounded-xl">CANCEL</button>
               <button onClick={saveUserEdits} className="flex-1 py-4 bg-emerald-600 rounded-xl font-bold">SAVE</button>
             </div>
          </div>
        </div>
       )}
    </div>
  );
};
