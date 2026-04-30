import React, { useState, useEffect, useRef } from 'react';
import { CodeEscape } from './components/CodeEscape';
import { CyberStrike } from './components/CyberStrike';
import { QuickPulse } from './components/QuickPulse';
import { AdminPanel } from './components/AdminPanel';
import { AnnouncementOverlay } from './components/AnnouncementOverlay';
import { 
  User, Settings, Bell, Gem, Coins, 
  MessageSquare, Users, Trophy, Backpack, Target,
  Play, Gamepad2, Search, X, Home, Loader2, LogOut, UserPlus,
  BadgeCheck, Plus, Shield, Medal, Award, Crown, Zap, Edit2, Camera,
  ShieldAlert, Sparkles, Lock, Bot, Swords, Terminal, Crosshair, Flame, Power
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  updateProfile 
} from 'firebase/auth';
import { 
  collection, doc, setDoc, getDoc, getDocs, query, 
  where, onSnapshot, addDoc, orderBy, limit, serverTimestamp, deleteDoc,
  updateDoc, or
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Not throwing to avoid crashing the whole app on individual data fetch errors
}

const RANKS = [
  { name: 'Rookie', label: 'Novato', levels: 'Nivel 1–9', badgeColor: 'bg-stone-500', borderColor: 'border-stone-500', color: 'from-stone-500 to-stone-400', textColor: 'text-stone-300', border: 'border-stone-500/40', shadow: 'shadow-stone-500/20', icon: <Target className="w-10 h-10" />, smallIcon: <Target className="w-3 h-3" />, desc: 'Principiante, aprendiendo lo básico.' },
  { name: 'Bronze', label: 'Bronce', levels: 'Nivel 10–24', badgeColor: 'bg-amber-600', borderColor: 'border-amber-600', color: 'from-amber-700 to-amber-500', textColor: 'text-amber-500', border: 'border-amber-600/40', shadow: 'shadow-amber-500/20', icon: <Shield className="w-10 h-10" />, smallIcon: <Shield className="w-3 h-3" />, desc: 'Entiendes el juego, pero falta consistencia.' },
  { name: 'Silver', label: 'Plata', levels: 'Nivel 25–39', badgeColor: 'bg-slate-300', borderColor: 'border-slate-300', color: 'from-slate-400 to-slate-200', textColor: 'text-slate-300', border: 'border-slate-300/40', shadow: 'shadow-slate-300/20', icon: <Medal className="w-10 h-10" />, smallIcon: <Medal className="w-3 h-3" />, desc: 'Jugador promedio, empieza a mejorar aim y estrategia.' },
  { name: 'Gold', label: 'Oro', levels: 'Nivel 40–59', badgeColor: 'bg-yellow-500', borderColor: 'border-yellow-500', color: 'from-yellow-600 to-yellow-400', textColor: 'text-yellow-400', border: 'border-yellow-400/40', shadow: 'shadow-yellow-400/30', icon: <Award className="w-10 h-10" />, smallIcon: <Award className="w-3 h-3" />, desc: 'Buen nivel, más victorias y mejores decisiones.' },
  { name: 'Platinum', label: 'Platino', levels: 'Nivel 60–79', badgeColor: 'bg-teal-500', borderColor: 'border-teal-500', color: 'from-teal-600 to-emerald-400', textColor: 'text-teal-400', border: 'border-teal-400/40', shadow: 'shadow-teal-400/30', icon: <Zap className="w-10 h-10" />, smallIcon: <Zap className="w-3 h-3" />, desc: 'Arriba del promedio, jugador sólido.' },
  { name: 'Diamond', label: 'Diamante', levels: 'Nivel 80–94', badgeColor: 'bg-cyan-500', borderColor: 'border-cyan-500', color: 'from-blue-600 to-cyan-400', textColor: 'text-cyan-400', border: 'border-cyan-400/40', shadow: 'shadow-cyan-400/40', icon: <Gem className="w-10 h-10" />, smallIcon: <Gem className="w-3 h-3" />, desc: 'Muy bueno, altamente competitivo.' },
  { name: 'Master', label: 'Maestro', levels: 'Nivel 95–99', badgeColor: 'bg-fuchsia-500', borderColor: 'border-fuchsia-500', color: 'from-purple-700 to-fuchsia-400', textColor: 'text-fuchsia-400', border: 'border-purple-500/40', shadow: 'shadow-purple-500/40', icon: <Trophy className="w-10 h-10" />, smallIcon: <Trophy className="w-3 h-3" />, desc: 'Elite del juego. Dominio casi perfecto.' },
  { name: 'Champion', label: 'Predator', levels: 'Nivel 100+', badgeColor: 'bg-rose-500', borderColor: 'border-rose-500', color: 'from-red-700 via-rose-500 to-orange-400', textColor: 'text-rose-400', border: 'border-rose-500/50', shadow: 'shadow-rose-500/60', icon: <Crown className="w-10 h-10 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]" />, smallIcon: <Crown className="w-3 h-3" />, desc: 'Top jugadores del servidor. Leyendas.' }
];

const PROFILE_SKINS = [
  { 
    id: 'neon-city', 
    name: 'Cyberpunk City', 
    price: 5000, 
    desc: 'A neon futuristic city skyline.', 
    className: 'bg-[url(https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=1920)] bg-cover bg-center',
    accent: 'text-cyan-400',
    border: 'border-cyan-500/50',
    glow: 'shadow-cyan-500/40',
    bg: 'bg-cyan-500'
  },
  { 
    id: 'moving-stars', 
    name: 'Deep Space', 
    price: 8000, 
    desc: 'Drift through the endless cosmos.', 
    className: 'bg-[url(https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1920)] bg-cover bg-center',
    accent: 'text-blue-400',
    border: 'border-blue-500/50',
    glow: 'shadow-blue-500/40',
    bg: 'bg-blue-500'
  },
  { 
    id: 'pixel-rain', 
    name: 'Digital Rain', 
    price: 10000, 
    desc: 'Matrix style pixel rain.', 
    className: 'bg-[url(https://images.unsplash.com/photo-1515630278258-407f66498911?q=80&w=1920)] bg-cover bg-center text-green-500',
    accent: 'text-green-500',
    border: 'border-green-500/50',
    glow: 'shadow-green-500/40',
    bg: 'bg-green-500'
  },
  { 
    id: 'soft-fire', 
    name: 'Ember Glow', 
    price: 15000, 
    desc: 'Warm glowing embers of an eternal flame.', 
    className: 'bg-[url(https://images.unsplash.com/photo-1512436991641-6745adb15998?q=80&w=1920)] bg-cover bg-center',
    accent: 'text-orange-500',
    border: 'border-orange-500/50',
    glow: 'shadow-orange-500/40',
    bg: 'bg-orange-500'
  },
];

const OWNER_EMAIL = 'marybeautysalonlashes@gmail.com';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('PLAY');
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(true);
  const [isLogin, setIsLogin] = useState(true);

  // Auth Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');

  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isModeSelectOpen, setIsModeSelectOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState('Default Game');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeSummon, setActiveSummon] = useState<any>(null);

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [userProfile, setUserProfile] = useState<any>(null);

  // Progression State
  const userLevel = userProfile?.level || 1;
  const currentXp = userProfile?.xp || 0;
  const xpForNextLevel = 1000;
  const xpPercentage = Math.min((currentXp / xpForNextLevel) * 100, 100);

  const getCurrentRank = (level: number) => {
    if (level < 10) return RANKS[0]; // Rookie
    if (level < 25) return RANKS[1]; // Bronce
    if (level < 40) return RANKS[2]; // Plata
    if (level < 60) return RANKS[3]; // Oro
    if (level < 80) return RANKS[4]; // Platino
    if (level < 95) return RANKS[5]; // Diamante
    if (level < 100) return RANKS[6]; // Maestro
    return RANKS[7]; // Champion
  };

  const currentRank = getCurrentRank(userLevel);

  // Friends State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUserProfile, setViewingUserProfile] = useState<any>(null);
  const [isViewingProfileLoading, setIsViewingProfileLoading] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState<any[]>([]);

  // Profile State
  const [newUsername, setNewUsername] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [isCodeEscapeActive, setIsCodeEscapeActive] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  
  const [bioInput, setBioInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile?.bio !== undefined) {
      setBioInput(userProfile.bio || '');
    }
  }, [userProfile?.bio]);

  const resizeAndConvertImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 250;
          const MAX_HEIGHT = 250;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    const file = e.target.files[0];
    try {
      setIsSavingProfile(true);
      const base64Image = await resizeAndConvertImage(file);
      await updateDoc(doc(db, 'users', user.uid), {
        photoUrl: base64Image
      });
      await updateProfile(auth.currentUser!, { photoURL: base64Image });
      setUser({ ...auth.currentUser!, photoURL: base64Image });
    } catch (err: any) {
      console.error("Photo upload error", err);
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveBio = async () => {
    if (!user) return;
    try {
      setIsSavingProfile(true);
      await updateDoc(doc(db, 'users', user.uid), {
        bio: bioInput.trim()
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const buySkin = async (skinId: string, price: number) => {
    if (!user || !userProfile) return;
    const currentCoins = userProfile.coins || 0;
    if (currentCoins < price) {
      alert("Not enough coins!");
      return;
    }
    const purchased = userProfile.purchasedSkins || [];
    if (purchased.includes(skinId)) {
      alert("You already own this design!");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        coins: currentCoins - price,
        purchasedSkins: [...purchased, skinId]
      });
      alert("Design purchased! Equip it in your Skin Profile.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const equipSkin = async (skinId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        equippedSkin: skinId
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [selectedGameMode, setSelectedGameMode] = useState<'SOLO' | 'MULTI' | null>(null);
  const [isCyberStrikeActive, setIsCyberStrikeActive] = useState(false);
  const [isQuickPulseActive, setIsQuickPulseActive] = useState(false);

  // Online users tracking
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      setOnlineUsersCount(snapshot.size);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
    return () => unsubscribe();
  }, []);

  const handleLevelProgression = async (performance: 'good' | 'medium' | 'bad') => {
    if (!user || !userProfile) return;
    
    let xpGain = 0;
    let coinGain = 0;

    if (performance === 'good') {
      xpGain = 500;
      coinGain = 500;
    } else if (performance === 'medium') {
      xpGain = 200;
      coinGain = 200;
    } else if (performance === 'bad') {
      xpGain = -100;
      coinGain = 0;
    }

    const newXp = Math.max(0, (userProfile.xp || 0) + xpGain);
    const newLevel = Math.floor(newXp / 1000) + 1;
    const newCoins = (userProfile.coins || 0) + coinGain;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        xp: newXp,
        level: newLevel,
        coins: newCoins
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleCodeEscapeComplete = async (performance: 'good' | 'medium' | 'bad') => {
    await handleLevelProgression(performance);
    setIsCodeEscapeActive(false);
    setSelectedGameMode(null);
  };

  const handleCyberStrikeComplete = async (performance: 'good' | 'medium' | 'bad') => {
    await handleLevelProgression(performance);
    setIsCyberStrikeActive(false);
    setSelectedGameMode(null);
  };

  const handleQuickPulseComplete = async (performance: 'good' | 'medium' | 'bad') => {
    await handleLevelProgression(performance);
    setIsQuickPulseActive(false);
    setSelectedGameMode(null);
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    
    if (!user) return;
    const trimmed = newUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 32) {
      setProfileMsg({ type: 'error', text: 'Username must be between 3 and 32 characters.' });
      return;
    }
    
    if (trimmed === userProfile?.username) {
      setProfileMsg({ type: 'error', text: 'That is already your username.' });
      return;
    }

    if (userProfile?.nameUpdatedAt) {
      const lastUpdate = userProfile.nameUpdatedAt.toDate();
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
      
      if (lastUpdate > threeHoursAgo) {
        const timeDiff = lastUpdate.getTime() - threeHoursAgo.getTime();
        const hoursLeft = Math.ceil(timeDiff / (1000 * 60 * 60));
        setProfileMsg({ type: 'error', text: `You must wait ${hoursLeft} hour(s) before changing your name again.` });
        return;
      }
    }

    setIsChangingUsername(true);
    try {
      const q = query(collection(db, 'users'), where('usernameLowercase', '==', trimmed.toLowerCase()));
      const snap = await getDocs(q);
      
      if (!snap.empty && snap.docs[0].id !== user.uid) {
        setProfileMsg({ type: 'error', text: 'Username is already taken.' });
        setIsChangingUsername(false);
        return;
      }

      await updateDoc(doc(db, 'users', user.uid), {
        username: trimmed,
        usernameLowercase: trimmed.toLowerCase(),
        nameUpdatedAt: serverTimestamp()
      });
      await updateProfile(auth.currentUser!, { displayName: trimmed });
      setUser({ ...auth.currentUser!, displayName: trimmed });
      setProfileMsg({ type: 'success', text: 'Username updated successfully!' });
      setNewUsername('');
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Could not update username. Is your setup correct?' });
    }
    setIsChangingUsername(false);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        setShowAuth(false);
      } else {
        setShowAuth(true);
        setUserProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // User Profile Listener
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (docRef) => {
      if (docRef.exists()) {
        const data = docRef.data();
        setUserProfile(data);
        
        // Sync email if missing or outdated
        if (user.email && data.email !== user.email) {
          updateDoc(doc(db, 'users', user.uid), { email: user.email }).catch(e => {
            console.error("Email sync fail", e);
            handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
          });
        }

        // Sync verification for owner account
        if (user.email === OWNER_EMAIL && !data.isVerified) {
          updateDoc(doc(db, 'users', user.uid), { isVerified: true }).catch(e => {
            console.error("Verification sync fail", e);
            handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
          });
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
    return () => unsub();
  }, [user]);

  // Global Chat Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'global_chat'), orderBy('createdAt', 'asc'), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setChatMessages(msgs);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'global_chat'));
    return () => unsub();
  }, [user]);

  // Friend Requests & Friends Listener
  useEffect(() => {
    if (!user) return;
    // Friend Requests sent TO me
    const qReq = query(collection(db, 'friend_requests'), where('toId', '==', user.uid), where('status', '==', 'pending'));
    const unsubReq = onSnapshot(qReq, (snapshot) => {
      const reqs: any[] = [];
      snapshot.forEach(doc => reqs.push({ id: doc.id, ...doc.data() }));
      setFriendRequests(reqs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'friend_requests'));

    // Friendships
    const qFriends = query(
      collection(db, 'friendships'), 
      or(where('user1', '==', user.uid), where('user2', '==', user.uid))
    );
    const unsubFriends = onSnapshot(qFriends, (snapshot) => {
      const friends: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const friendId = data.user1 === user.uid ? data.user2 : data.user1;
        const friendUsername = data.user1 === user.uid ? data.user2Username : data.user1Username;
        friends.push({ id: doc.id, friendId, friendUsername });
      });
      setFriendsList(friends);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'friendships'));

    // Suggested / All Users
    const qAllUsers = query(collection(db, 'users'), limit(50));
    const unsubAllUsers = onSnapshot(qAllUsers, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach(doc => {
        if (doc.id !== user.uid) {
          users.push(doc.data());
        }
      });
      setSuggestedUsers(users);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => { unsubReq(); unsubFriends(); unsubAllUsers(); };
  }, [user]);

  // Leaderboard Listener
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('level', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach(doc => users.push(doc.data()));
      setLeaderboardUsers(users);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users/leaderboard'));
    return () => unsub();
  }, []);

  // Viewing Profile Listener
  useEffect(() => {
    if (!viewingUserId) {
      setViewingUserProfile(null);
      return;
    }
    setIsViewingProfileLoading(true);
    const unsub = onSnapshot(doc(db, 'users', viewingUserId), (doc) => {
      if (doc.exists()) {
        setViewingUserProfile(doc.data());
      }
      setIsViewingProfileLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${viewingUserId}`);
      setIsViewingProfileLoading(false);
    });
    return () => unsub();
  }, [viewingUserId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!isLogin && username.trim().length < 3) {
      setAuthError('Username must be at least 3 characters.');
      return;
    }
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username.trim() });
        // Create user doc
        await setDoc(doc(db, 'users', cred.user.uid), {
          userId: cred.user.uid,
          username: username.trim(),
          usernameLowercase: username.trim().toLowerCase(),
          email: cred.user.email,
          createdAt: serverTimestamp(),
          coins: 0,
          level: 1,
          xp: 0,
          purchasedSkins: [],
          equippedSkin: null
        });
      }
      setEmail('');
      setPassword('');
      setUsername('');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // Global Config Listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'global'), (docSnap) => {
      // Logic for future global config
    }, (error) => handleFirestoreError(error, OperationType.GET, 'config/global'));
    return () => unsub();
  }, []);

  // Summoning Listener
  useEffect(() => {
    if (!user) {
      setActiveSummon(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'summons', user.uid), (docSnap) => {
      if (docSnap.exists() && docSnap.data().status === 'active') {
        setActiveSummon(docSnap.data());
      } else {
        setActiveSummon(null);
      }
    }, (error) => {
      // Quietly handle permission errors here as they might happen during sign out
      if (error instanceof Error && error.message.includes('insufficient permissions')) return;
      handleFirestoreError(error, OperationType.GET, `summons/${user.uid}`);
    });
    return () => unsub();
  }, [user]);

  const handleSendMessage = async () => {
    if (chatInput.trim() !== '' && user) {
      const msg = chatInput.trim();
      setChatInput("");

      // Admin command check
      if (msg === '/admin' && user.email === OWNER_EMAIL) {
        setIsAdminOpen(true);
        return;
      }

      // Mute check
      if (userProfile?.isMuted) {
        setChatInput("");
        return;
      }

      try {
        await addDoc(collection(db, 'global_chat'), {
          userId: user.uid,
          username: user.displayName || 'Unknown',
          msg,
          isVerified: userProfile?.isVerified || (user.email === OWNER_EMAIL),
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'global_chat');
      }
    }
  };

  const handleSearchUsers = async () => {
    if (searchQuery.trim().length < 3) return;
    try {
      const q = query(
        collection(db, 'users'), 
        where('usernameLowercase', '>=', searchQuery.toLowerCase()),
        where('usernameLowercase', '<=', searchQuery.toLowerCase() + '\uf8ff'),
        limit(10)
      );
      const snap = await getDocs(q);
      const results: any[] = [];
      snap.forEach(docItem => {
        if (docItem.id !== user?.uid) {
          results.push(docItem.data());
        }
      });
      setSearchResults(results);
    } catch (error) {
       handleFirestoreError(error, OperationType.LIST, 'users');
    }
  };

  const handleSendFriendRequest = async (targetId: string, targetUsername: string) => {
    try {
      const requestId = `${user.uid}_${targetId}`;
      await setDoc(doc(db, 'friend_requests', requestId), {
        fromId: user.uid,
        toId: targetId,
        fromUsername: user.displayName || 'Unknown',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert('Request sent!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `friend_requests`);
    }
  };

  const handleAcceptRequest = async (req: any) => {
    try {
      // Create friendship
      const user1 = user.uid < req.fromId ? user.uid : req.fromId;
      const user2 = user.uid < req.fromId ? req.fromId : user.uid;
      const user1Username = user.uid < req.fromId ? user.displayName : req.fromUsername;
      const user2Username = user.uid < req.fromId ? req.fromUsername : user.displayName;
      
      const friendshipId = `${user1}_${user2}`;
      await setDoc(doc(db, 'friendships', friendshipId), {
        user1, user2, user1Username, user2Username, createdAt: serverTimestamp()
      });
      // Delete request
      await deleteDoc(doc(db, 'friend_requests', req.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `friendships/requests`);
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    try {
      await deleteDoc(doc(db, 'friend_requests', reqId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `friend_requests`);
    }
  };

  if (authLoading) return <div className="h-screen w-screen bg-[#0A0B10] flex items-center justify-center text-white"><Loader2 className="animate-spin w-8 h-8" /></div>;

  const isOwner = user?.email === OWNER_EMAIL;

  return (
    <div className="relative h-screen w-screen bg-slate-900 text-white overflow-hidden font-sans select-none">
      
        {/* Announcement Overlay */}
        {user && <AnnouncementOverlay userId={user.uid} />}
        
        {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/40 via-transparent to-purple-900/40" />
        <div className="absolute bottom-0 left-1/4 md:left-1/3 w-96 h-[80%] bg-white/5 rounded-t-full blur-3xl opacity-50" />
        {/* Character placeholder silhouette */}
        <div className="absolute bottom-0 left-[10%] md:left-1/3 w-64 md:w-80 h-[60%] md:h-[70%] bg-gradient-to-t from-slate-800 to-slate-500/20 rounded-t-3xl border-t border-x border-white/5 shadow-2xl" />
      </div>

      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        {/* Top Navigation Bar */}
        <div className="w-full bg-black/40 backdrop-blur-md border-b border-white/10 flex justify-between items-center px-4 md:px-8 h-14 md:h-16 pointer-events-auto shrink-0">
          {/* Left Tabs */}
          <div className="flex space-x-4 md:space-x-8 h-full overflow-x-auto no-scrollbar">
            {['PLAY', 'RANKS', 'STORE', 'PROFILE'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`h-full flex items-center px-1 md:px-2 border-b-4 transition-colors font-black tracking-widest text-xs md:text-lg italic shrink-0 ${activeTab === tab ? 'border-yellow-400 text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Right Resources & Menu */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-3 bg-white/10 rounded-full px-3 py-1">
              <Coins className="w-4 h-4 text-cyan-300" />
              <span className="font-black text-sm italic">{userProfile?.coins || 0}</span>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setIsFriendsOpen(!isFriendsOpen)} className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white/10 rounded-lg hover:bg-white/20 transition">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  {friendRequests.length > 0 && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></div>}
               </button>
               <button onClick={() => signOut(auth)} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white/10 rounded-lg hover:bg-red-500/80 transition text-red-400 hover:text-white" title="Logout">
                  <LogOut className="w-4 h-4 md:w-5 md:h-5" />
               </button>
            </div>
          </div>
        </div>

        {activeTab === 'PLAY' && (
          <div className="flex-1 relative flex flex-col items-center justify-center pointer-events-none">
            {/* The Legendary Player Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 30, rotateY: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateY: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 100 }}
              className="relative z-10 pointer-events-auto"
            >
              {/* Card Holographic Container */}
              <div className={`relative w-60 md:w-64 h-[340px] md:h-[400px] bg-black/70 backdrop-blur-3xl rounded-[1.75rem] border-[3px] ${currentRank.borderColor} shadow-[0_0_40px_rgba(0,0,0,0.6)] overflow-hidden group`}>
                
                {/* Visual Flair: Rank Shine */}
                <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${currentRank.color} opacity-50`}></div>
                
                {/* Card Header */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20">
                  <div className="flex flex-col">
                    <span className={`text-[7px] font-black uppercase tracking-[0.15rem] ${currentRank.textColor} opacity-80`}>Elite Node</span>
                    <h3 className="text-lg font-black italic uppercase tracking-tighter text-white leading-tight">{currentRank.label}</h3>
                  </div>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${currentRank.color} shadow-lg ${currentRank.shadow} scale-75 origin-top-right`}>
                    <div className="text-white">
                      {currentRank.smallIcon}
                    </div>
                  </div>
                </div>

                {/* Avatar Surface */}
                <div className="absolute top-14 left-2.5 right-2.5 bottom-24 bg-slate-900/40 rounded-xl overflow-hidden border border-white/5 shadow-inner">
                  <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                  
                  <div className="absolute inset-0 flex items-end justify-center pb-2">
                    <motion.img 
                      key={userProfile?.photoUrl || user?.photoURL}
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      src={userProfile?.photoUrl || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || 'Felix'}&backgroundColor=b6e3f4`} 
                      className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-full shadow-2xl transition-transform group-hover:scale-105"
                    />
                  </div>
                </div>

                {/* Level Tag */}
                <div className="absolute top-36 right-5 z-30">
                  <div className="bg-yellow-400 text-black px-2 py-1 rounded-md font-black italic text-[10px] shadow-lg rotate-12 border border-black/10">
                    LV {userLevel}
                  </div>
                </div>

                {/* Card Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pb-3 bg-gradient-to-t from-black via-black/90 to-transparent z-20">
                   <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 mb-1">
                        <h2 className="text-sm md:text-base font-black italic uppercase tracking-tighter text-white truncate max-w-[140px]">
                           {userProfile?.username || user?.displayName || 'Unknown'}
                        </h2>
                        {(userProfile?.isVerified || isOwner) && <BadgeCheck className="w-3 h-3 text-blue-400" />}
                      </div>
                      
                      {/* Stats Section */}
                      <div className="w-full flex items-center justify-center gap-4 mt-1 border-t border-white/10 pt-2.5">
                         <div className="flex flex-col items-start">
                            <span className="text-[6px] font-bold text-slate-500 uppercase tracking-widest leading-none">XP Node</span>
                            <div className="flex items-center gap-0.5 mt-0.5">
                               <Zap className="w-2 h-2 text-yellow-400" />
                               <span className="font-black italic text-[10px] text-white">{(currentXp || 0).toLocaleString()}</span>
                            </div>
                         </div>
                         <div className="w-px h-6 bg-white/10 shadow-sm"></div>
                         <div className="flex flex-col items-start">
                            <span className="text-[6px] font-bold text-slate-500 uppercase tracking-widest leading-none">Credits</span>
                            <div className="flex items-center gap-0.5 mt-0.5">
                               <Coins className="w-2 h-2 text-cyan-400" />
                               <span className="font-black italic text-[10px] text-white">{(userProfile?.coins || 0).toLocaleString()}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Holographic Flash */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out pointer-events-none"></div>
              </div>
              
              {/* Stand Shadow */}
              <div className="mx-auto w-20 h-2.5 bg-black/40 blur-xl rounded-full mt-4 scale-x-150"></div>
            </motion.div>

            {/* Existing silhouette (removed or kept as background) */}
            <div className="absolute bottom-0 left-[10%] md:left-1/3 w-64 md:w-80 h-[60%] md:h-[70%] bg-gradient-to-t from-slate-800 to-slate-500/20 rounded-t-3xl border-t border-x border-white/5 shadow-2xl opacity-20 pointer-events-none" />

            {/* Mobile/Side Elements */}
            <div className="p-4 md:p-8 w-full absolute top-0 left-0 flex justify-between">
              <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-full p-2 pr-6 border border-white/5 shadow-lg w-fit transition hover:bg-black/60 cursor-pointer">
                    <div className="relative">
                      <img src={userProfile?.photoUrl || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || 'Felix'}&backgroundColor=b6e3f4`} className={`w-10 h-10 md:w-14 md:h-14 rounded-full border-2 ${currentRank.borderColor} bg-slate-800 object-cover`} />
                      <div className={`absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 ${currentRank.badgeColor} border-2 border-slate-900 text-white p-1 rounded-full`}>
                        {currentRank.smallIcon}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="font-black italic text-sm md:text-lg leading-tight tracking-tight flex items-center gap-1 text-white">
                          {userProfile?.username || user?.displayName || 'Guest'}
                          {(userProfile?.isVerified || isOwner) && <BadgeCheck className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />}
                        </div>
                        <div className="flex items-center gap-2">
                           <div className={`text-[9px] md:text-[10px] ${currentRank.textColor} font-black uppercase tracking-wider flex items-center gap-1`}>
                             {currentRank.name} <span className="text-white/50 lowercase italic font-medium">lv.{userLevel}</span>
                           </div>
                           <div className="w-16 md:w-20 h-1 bg-white/5 rounded-full overflow-hidden border border-white/10 shrink-0">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${xpPercentage}%` }}
                                className={`h-full ${currentRank.badgeColor}`}
                              />
                           </div>
                        </div>
                    </div>
                 </div>
                 
                 {/* Add player button */}
                 <button onClick={() => setIsFriendsOpen(true)} className="flex items-center gap-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full p-2 pr-6 border border-white/5 transition w-fit group cursor-pointer shadow-lg">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center group-hover:border-white/60 transition">
                      <Plus className="w-5 h-5 text-white/50 group-hover:text-white transition" />
                    </div>
                    <div className="font-bold text-xs md:text-sm text-white/50 group-hover:text-white transition uppercase tracking-wider">Add Player</div>
                 </button>
              </div>
            </div>

            {/* Bottom Left: Global Chat Button */}
            <div className="absolute bottom-6 left-4 md:left-8 z-20 pointer-events-auto">
              <button onClick={() => setIsChatOpen(true)} className="flex items-center gap-2 md:gap-3 bg-black/50 hover:bg-black/70 backdrop-blur-md px-3 py-2 md:px-4 md:py-3 rounded-xl border border-white/10 transition shadow-lg">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                <span className="font-bold text-xs md:text-sm uppercase tracking-wider text-white/80">Global Chat</span>
              </button>
            </div>

            {/* Bottom Right: Play Button & Mode Select */}
            <div className="absolute bottom-6 right-4 md:right-8 z-20 flex flex-col items-end gap-2 md:gap-4 pointer-events-auto">
               <div className="flex items-stretch bg-black/60 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                  <div className="p-3 md:p-4 bg-gradient-to-b from-blue-900/50 to-purple-900/50 w-24 md:w-32 flex flex-col justify-end border-r border-white/10">
                     <Gamepad2 className="w-6 h-6 md:w-8 md:h-8 mb-auto text-white/50" />
                     <div className="font-black italic text-sm md:text-xl leading-none mt-2 text-white/80">BY DEV</div>
                  </div>
                  <div className="p-3 md:p-4 w-36 md:w-48 flex flex-col items-start justify-center gap-0.5">
                     <span className="text-white/50 text-[10px] md:text-xs font-bold uppercase tracking-wider">Current Mode</span>
                     <span className="font-black text-lg md:text-2xl italic leading-none truncate w-full">{selectedMode.toUpperCase()}</span>
                     <span className="text-blue-400 text-[10px] md:text-xs font-bold uppercase w-full">v1.0</span>
                     <button onClick={() => setIsModeSelectOpen(true)} className="mt-2 w-full py-1.5 md:py-2 bg-white/10 hover:bg-white/20 rounded font-bold text-[10px] md:text-xs uppercase transition border border-white/5">Change</button>
                  </div>
               </div>
               
               <button 
                 onClick={() => {
                   if (selectedMode === 'Code Escape' || selectedMode === 'Cyber Strike' || selectedMode === 'Quick Pulse') {
                     setIsModeSelectOpen(true);
                   } else {
                     alert("This mode is currently in development.");
                   }
                 }}
                 className="w-full bg-yellow-400 hover:bg-yellow-300 text-black py-4 md:py-5 px-8 rounded-xl font-black italic tracking-wider text-3xl md:text-4xl shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_40px_rgba(250,204,21,0.5)] transition-all border-b-[6px] border-yellow-600 active:translate-y-1 active:border-b-0"
               >
                  PLAY
               </button>
            </div>
          </div>
        )}

        {activeTab === 'STORE' && (
          <div className="relative flex-1 min-h-0 w-full p-4 pb-32 md:p-8 md:pb-32 overflow-y-auto pointer-events-auto z-20">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black italic tracking-widest text-white mb-2 uppercase flex items-center gap-3">
                <Coins className="w-8 h-8 text-cyan-400" />
                Skin Store
              </h2>
              <p className="text-slate-400 font-medium mb-8">Purchase exclusive profile banners using your coins.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {PROFILE_SKINS.map((skin, index) => {
                  const isOwned = userProfile?.purchasedSkins?.includes(skin.id);
                  const isEquipped = userProfile?.equippedSkin === skin.id;
                  return (
                    <motion.div 
                      key={skin.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] hover:border-sky-400/50 cursor-pointer"
                    >
                      <div className={`h-40 w-full ${skin.className} relative`}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                        {isOwned && (
                          <div className="absolute top-4 right-4 bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                            Owned
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className={`text-2xl font-black italic tracking-widest uppercase mb-2 ${skin.id === 'pixel-rain' ? 'text-green-500' : 'text-white'}`}>{skin.name}</h3>
                        <p className="text-slate-400 text-sm mb-6 flex-1">{skin.desc}</p>
                        
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-2">
                            <Coins className="w-5 h-5 text-cyan-400" />
                            <span className="text-xl font-black italic text-cyan-400">{skin.price.toLocaleString()}</span>
                          </div>
                          
                          {isEquipped ? (
                            <button disabled className="bg-white/10 text-white font-bold uppercase tracking-wider px-6 py-3 rounded-xl cursor-default border border-white/10">
                              Equipped
                            </button>
                          ) : isOwned ? (
                            <button 
                              onClick={() => equipSkin(skin.id)}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition shadow-lg shadow-blue-500/20"
                            >
                              Equip
                            </button>
                          ) : (
                            <button 
                              onClick={() => buySkin(skin.id, skin.price)}
                              disabled={(userProfile?.coins || 0) < skin.price}
                              className={`font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition shadow-lg ${
                                (userProfile?.coins || 0) < skin.price 
                                  ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5' 
                                  : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20'
                              }`}
                            >
                              Purchase
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'RANKS' && (
          <div className="relative flex-1 min-h-0 w-full p-4 pb-32 md:p-8 md:pb-32 overflow-y-auto pointer-events-auto z-20">
            {/* HERO SECTION FOR CURRENT RANK */}
            <div className="mb-8 md:mb-12 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-10 relative overflow-hidden shadow-2xl">
              {/* Glow */}
              <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl ${currentRank.color} opacity-20 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none`}></div>
              
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 w-full">
                <div className={`relative w-32 h-32 md:w-48 md:h-48 rounded-3xl flex items-center justify-center bg-gradient-to-br ${currentRank.color} shadow-lg ${currentRank.shadow} border-4 border-white/20 rotate-3 transition-transform hover:rotate-6 shrink-0`}>
                   <div className="absolute inset-0 bg-black/30 rounded-[1.2rem]"></div>
                   <div className="relative text-white filter drop-shadow-lg scale-150">
                     {currentRank.icon}
                   </div>
                </div>

                <div className="flex-1 w-full text-center md:text-left mt-4 md:mt-0">
                  <div className="text-xs md:text-sm uppercase font-bold text-slate-400 tracking-widest mb-1">Your Current Rank</div>
                  <h2 className={`text-4xl md:text-6xl font-black italic uppercase tracking-widest bg-gradient-to-r ${currentRank.color} bg-clip-text text-transparent drop-shadow-sm mb-6`}>
                    {currentRank.label}
                  </h2>
                  
                  {/* Progress Bar */}
                  <div className="bg-black/60 rounded-2xl p-4 md:p-6 border border-white/5 shadow-inner">
                     <div className="flex justify-between items-end mb-3">
                        <div className="flex flex-col items-start gap-0.5">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current</span>
                           <span className="font-black italic text-3xl text-white leading-none">LVL {userLevel}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Next</span>
                           <span className="font-black italic text-2xl text-white/50 leading-none">LVL {userLevel + 1}</span>
                        </div>
                     </div>
                     
                     <div className="relative h-5 md:h-6 bg-slate-900 rounded-full overflow-hidden border border-white/10 shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${xpPercentage}%` }}
                          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                          className={`absolute top-0 left-0 h-full bg-gradient-to-r ${currentRank.color}`}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </motion.div>
                     </div>
                     <div className="mt-3 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                       <span>{currentXp.toLocaleString()} XP</span>
                       <span>{xpForNextLevel.toLocaleString()} XP</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-2xl md:text-4xl font-black italic tracking-widest text-white mb-2 uppercase">Ranked Leagues</h2>
            <p className="text-slate-400 mb-8 max-w-2xl text-sm md:text-base">Level up your rank by playing and winning games. Higher ranks show your true skill level.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
               {RANKS.map((rank, i) => (
                  <div key={i} className={`relative bg-black/60 backdrop-blur-md rounded-2xl p-6 border ${rank.border} flex flex-col items-center text-center gap-4 overflow-hidden shadow-lg shadow-black/50 hover:-translate-y-1 transition-all duration-300 group ${i === 0 ? 'ring-2 ring-white/20' : ''}`}>
                     {/* Glow effect */}
                     <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b ${rank.color} opacity-10 blur-2xl rounded-full`}></div>
                     
                     <div className={`relative w-24 h-24 rounded-2xl flex items-center justify-center bg-gradient-to-br ${rank.color} shadow-lg ${rank.shadow} border-2 border-white/20 rotate-3 group-hover:rotate-6 transition-transform`}>
                        <div className="absolute inset-0 bg-black/20 rounded-xl"></div>
                        <div className="relative text-white filter drop-shadow-md">
                          {rank.icon}
                        </div>
                     </div>
                     <div className="relative z-10 w-full">
                        <div className={`font-black italic uppercase tracking-widest text-xl md:text-2xl bg-gradient-to-r ${rank.color} bg-clip-text text-transparent drop-shadow-sm`}>{rank.label}</div>
                        <div className="flex items-center justify-center gap-2 mt-1 mb-3">
                           <div className="text-[10px] uppercase font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">{rank.name}</div>
                           <div className={`text-[10px] uppercase font-bold ${rank.textColor} tracking-wider`}>{rank.levels}</div>
                        </div>
                        <div className="text-xs text-slate-300/80 font-medium px-2">{rank.desc}</div>
                     </div>
                  </div>
               ))}
            </div>

            {/* LEADERBOARD SECTION */}
            <div className="mt-12 bg-black/40 backdrop-blur-lg rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
               <div className="p-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-400 rounded-2xl rotate-3 shadow-lg shadow-yellow-400/20">
                      <Crown className="w-8 h-8 text-black" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Top Global Legends</h3>
                      <p className="text-sm font-mono text-slate-400 uppercase tracking-widest">Active leaderboard of elite rank players.</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 px-6 py-2 bg-white/5 rounded-full border border-white/10">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-400">{leaderboardUsers.length} PLYRS</span>
                  </div>
               </div>

               <div className="p-4 md:p-8 space-y-3">
                  {leaderboardUsers.map((lUser, idx) => {
                    const lRank = getCurrentRank(lUser.level || 1);
                    const isCurrentUser = lUser.userId === user?.uid;
                    const isTop1 = idx === 0;
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={lUser.userId}
                        onClick={() => setViewingUserId(lUser.userId)}
                        className={`group relative flex items-center justify-between p-4 md:p-6 rounded-2xl border transition-all cursor-pointer overflow-hidden
                          ${isCurrentUser ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}
                          ${isTop1 ? 'md:py-8' : ''}
                        `}
                      >
                         {/* Rank Number */}
                         <div className="flex items-center gap-4 md:gap-8 relative z-10 shrink-0">
                            <div className={`w-10 md:w-12 h-10 md:h-12 flex items-center justify-center font-black italic text-xl md:text-2xl rounded-xl
                              ${idx === 0 ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/40 rotate-3' : 
                                idx === 1 ? 'bg-slate-300 text-slate-800' : 
                                idx === 2 ? 'bg-amber-600 text-amber-50' : 'bg-black/40 text-slate-500'}
                            `}>
                               {idx + 1}
                            </div>
                            
                            <div className="flex items-center gap-3 md:gap-5">
                               <div className="relative">
                                  <img 
                                    src={lUser.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${lUser.username}&backgroundColor=b6e3f4`} 
                                    className={`w-10 h-10 md:w-16 md:h-16 rounded-2xl object-cover border-2 shadow-lg transition-transform group-hover:scale-110 ${lRank.borderColor}`}
                                  />
                                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border border-black shadow-lg ${lRank.badgeColor}`}>
                                    {lRank.smallIcon}
                                  </div>
                               </div>
                               <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                     <span className={`font-black italic text-lg md:text-2xl uppercase tracking-tighter leading-none ${isTop1 ? 'text-yellow-400' : 'text-white'}`}>
                                        {lUser.username}
                                     </span>
                                     {(lUser.isVerified || lUser.email === OWNER_EMAIL) && <BadgeCheck className="w-4 h-4 text-blue-400" />}
                                     {isCurrentUser && <span className="text-[10px] font-black bg-blue-500 text-white px-2 py-0.5 rounded leading-none uppercase">You</span>}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                     <span className={`text-[10px] font-black uppercase tracking-widest ${lRank.textColor}`}>{lRank.name}</span>
                                     <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Node #{idx + 1}</span>
                                  </div>
                               </div>
                            </div>
                         </div>

                         <div className="flex items-center gap-4 md:gap-12 relative z-10 shrink-0">
                            <div className="text-right flex flex-col items-end">
                               <div className="text-3xl md:text-5xl font-black italic tracking-tighter leading-none text-white/90">
                                  <span className="text-lg md:text-xl text-white/40 mr-1 not-italic">LVL</span>
                                  {lUser.level || 1}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                  {(lUser.xp || 0).toLocaleString()} XP Accumulated
                                </div>
                            </div>
                            <div className="hidden md:flex w-10 h-10 items-center justify-center bg-white/5 rounded-full border border-white/10 group-hover:bg-white/20 transition-all">
                               <Zap className="w-5 h-5 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                         </div>
                         
                         {/* Effects for Top 1 */}
                         {isTop1 && (
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 via-transparent to-transparent pointer-events-none"></div>
                         )}
                      </motion.div>
                    );
                  })}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'PROFILE' && (() => {
          const isOwner = user?.email === OWNER_EMAIL;
          const equippedSkinObj = PROFILE_SKINS.find(s => s.id === userProfile?.equippedSkin);
          return (
          <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-3xl overflow-y-auto pointer-events-auto">
            <div className="min-h-full flex flex-col items-center p-4 py-16 md:p-8 relative">
              <button 
                onClick={() => setActiveTab('PLAY')} 
                className="absolute top-4 right-4 md:fixed md:top-8 md:right-8 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-slate-300 z-50"
              >
                <X className="w-6 h-6 md:w-8 md:h-8" />
              </button>
              <div className={`w-full max-w-5xl mt-8 mb-12 bg-black/40 backdrop-blur-md rounded-3xl border transition-all duration-700 relative overflow-hidden shadow-2xl 
                ${isOwner ? 'border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.3)]' : (equippedSkinObj ? `${equippedSkinObj.border} ${equippedSkinObj.glow} animate-[pulse_3s_infinite]` : 'border-white/10')}
                ${equippedSkinObj || isOwner ? 'pt-32 md:pt-48 pb-6 md:pb-10' : 'p-6 md:p-10 border-white/10'}
              `}>
                {/* Decorative Elements for Owner */}
                {isOwner && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-[shimmer_2s_infinite]"></div>
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/20 blur-[100px] rounded-full animate-pulse"></div>
                  </>
                )}

                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
                
                {(equippedSkinObj || isOwner) && (
                  <div className={`absolute top-0 left-0 right-0 h-48 md:h-64 ${isOwner ? 'bg-[url(https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1920)] bg-cover' : equippedSkinObj?.className} opacity-80 pointer-events-none`}>
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                  </div>
                )}
                
                <div className={`flex flex-col items-center relative z-10 w-full ${equippedSkinObj || isOwner ? 'px-6 md:px-10 -mt-20 md:-mt-24' : ''}`}>
                <div className="relative mb-6">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <img 
                      src={userProfile?.photoUrl || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || 'Felix'}&backgroundColor=b6e3f4`} 
                      className={`w-28 h-28 md:w-40 md:h-40 rounded-full border-4 ${isOwner ? 'border-amber-500' : (equippedSkinObj ? equippedSkinObj.border : currentRank.borderColor)} bg-slate-800 shadow-xl object-cover transition duration-300 group-hover:brightness-50`} 
                      alt="Avatar" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                       <Camera className="w-8 h-8 text-white drop-shadow-md" />
                    </div>
                  </div>
                  <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
 
                  <div className={`absolute -bottom-2 -right-2 ${isOwner ? 'bg-amber-500' : (equippedSkinObj ? equippedSkinObj.bg : currentRank.badgeColor)} border-4 border-slate-900 text-white p-2 rounded-full shadow-lg`}>
                    {isOwner ? <ShieldAlert className="w-5 h-5 text-black" /> : currentRank.smallIcon}
                  </div>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-black italic tracking-widest text-white mb-1 uppercase text-center flex items-center justify-center gap-3">
                  <span className={`${isOwner ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400' : (equippedSkinObj ? equippedSkinObj.accent : '')} transition-colors duration-500 drop-shadow-lg`}>
                    {userProfile?.username || user?.displayName || 'Player'}
                  </span>
                  <Edit2 className="w-5 h-5 text-white/30 hover:text-white transition cursor-pointer" onClick={() => document.getElementById('username-input')?.focus()}/>
                </h2>
                <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isOwner ? 'text-amber-500' : 'text-slate-400'}`}>{isOwner ? 'MASTER SYSTEM OWNER' : user?.email}</div>

 
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-4">
                  <div className="flex flex-col gap-6 md:gap-8 w-full">
                    {/* Bio Section */}
                    <div className={`w-full bg-black/40 rounded-2xl p-6 border transition-all duration-500 ${equippedSkinObj ? equippedSkinObj.border + ' ' + equippedSkinObj.glow : 'border-white/5'} focus-within:border-white/20`}>
                       <div className="flex justify-between items-center mb-4">
                         <span className={`text-xs font-bold uppercase tracking-widest ${equippedSkinObj ? equippedSkinObj.accent : 'text-slate-500'}`}>Bio</span>
                       </div>
                       <textarea
                         value={bioInput}
                         onChange={(e) => setBioInput(e.target.value)}
                         placeholder="Add a bio (max 500 chars)..."
                         maxLength={500}
                         className="w-full bg-transparent text-white/90 text-sm md:text-base placeholder-white/30 resize-none focus:outline-none min-h-[90px]"
                       />
                       <div className="flex justify-between items-center mt-4">
                         <span className="text-xs font-bold text-slate-600">{bioInput.length}/500</span>
                         {bioInput !== (userProfile?.bio || '') && (
                            <button 
                              onClick={handleSaveBio}
                              disabled={isSavingProfile}
                              className={`${equippedSkinObj ? equippedSkinObj.bg + ' hover:opacity-90' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition shadow-lg`}
                            >
                              {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Bio'}
                            </button>
                         )}
                       </div>
                    </div>
                    
                    {/* Change Username Section */}
                    <div className={`w-full bg-black/60 rounded-2xl p-6 border transition-colors duration-500 ${equippedSkinObj ? equippedSkinObj.border : 'border-white/5'}`}>
                      <h3 className={`text-xl font-bold tracking-widest uppercase mb-4 ${equippedSkinObj ? equippedSkinObj.accent : 'text-white/90'}`}>Change Username</h3>
                      <form onSubmit={handleUpdateUsername} className="flex flex-col gap-4">
                        <p className="text-sm text-slate-400">You can change your username once every 3 hours.</p>
                        <div className="flex flex-col gap-3">
                          <input 
                            id="username-input"
                            type="text" 
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="New username"
                            className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none font-medium transition-colors duration-500 ${equippedSkinObj ? equippedSkinObj.border + ' focus:border-white' : 'border-white/10 focus:border-blue-500'}`}
                            maxLength={32}
                          />
                          <button 
                            type="submit" 
                            disabled={isChangingUsername || !newUsername.trim()}
                            className={`text-white font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition flex items-center justify-center w-full shadow-lg ${equippedSkinObj ? equippedSkinObj.bg + ' hover:opacity-90 shadow-' + equippedSkinObj.glow : 'bg-blue-600 hover:bg-blue-500'}`}
                          >
                            {isChangingUsername ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update'}
                          </button>
                        </div>
                        {profileMsg.text && (
                          <div className={`text-sm font-medium mt-2 px-4 py-2 rounded-lg border ${profileMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                            {profileMsg.text}
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
 
                  <div className="flex flex-col w-full h-full">
                    {/* Skin Profile Section */}
                    <div className={`w-full h-full bg-black/60 rounded-2xl p-6 border transition-colors duration-500 flex flex-col ${equippedSkinObj ? equippedSkinObj.border + ' ' + equippedSkinObj.glow : 'border-white/5'}`}>
                      <h3 className={`text-xl font-bold tracking-widest uppercase mb-4 ${equippedSkinObj ? equippedSkinObj.accent : 'text-white/90'}`}>Skin Profile</h3>
                      <div className="bg-white/5 rounded-xl border border-white/10 p-6 flex-1 flex flex-col items-center">
                         {(!userProfile?.purchasedSkins || userProfile?.purchasedSkins.length === 0) ? (
                            <div className="flex flex-col items-center justify-center flex-1 w-full text-center">
                              <p className="text-slate-400 font-medium pb-2 text-lg mt-8">No skins collected yet.</p>
                              <p className="text-sm text-slate-500 pb-2">Visit the STORE to buy animated banners.</p>
                            </div>
                         ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                              {PROFILE_SKINS.filter(s => userProfile?.purchasedSkins?.includes(s.id)).map(skin => (
                                 <div key={skin.id} className={`rounded-xl border flex flex-col overflow-hidden relative group cursor-pointer transition-all ${userProfile?.equippedSkin === skin.id ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'border-white/10 hover:border-white/30'}`} onClick={() => userProfile?.equippedSkin !== skin.id && equipSkin(skin.id)}>
                                    <div className={`h-24 w-full ${skin.className}`}></div>
                                    <div className="p-3 bg-black/80 flex justify-between items-center">
                                      <span className="text-xs font-bold uppercase tracking-wider text-white line-clamp-1 mr-2">{skin.name}</span>
                                      {userProfile?.equippedSkin === skin.id ? (
                                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded font-bold uppercase tracking-wider shrink-0 border border-cyan-500/30">Equipped</span>
                                      ) : (
                                        <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded font-bold uppercase tracking-wider shrink-0 transition">Equip</button>
                                      )}
                                    </div>
                                 </div>
                              ))}
                            </div>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
          );
        })()}
      </div>

      {/* Slide-out Panels */}
      <AnimatePresence>
        {isCodeEscapeActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100]">
            <CodeEscape 
              onClose={() => setIsCodeEscapeActive(false)} 
              onComplete={handleCodeEscapeComplete}
              isOnline={selectedGameMode === 'MULTI'}
              isAdmin={user?.email === OWNER_EMAIL}
            />
          </motion.div>
        )}
        {isCyberStrikeActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100]">
            <CyberStrike 
              onClose={() => setIsCyberStrikeActive(false)} 
              onComplete={handleCyberStrikeComplete}
              isOnline={selectedGameMode === 'MULTI'}
              isAdmin={user?.email === OWNER_EMAIL}
            />
          </motion.div>
        )}
        {isQuickPulseActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100]">
            <QuickPulse 
              onClose={() => setIsQuickPulseActive(false)} 
              onComplete={handleQuickPulseComplete}
              isOnline={selectedGameMode === 'MULTI'}
              isAdmin={user?.email === OWNER_EMAIL}
              currentUser={user}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModeSelectOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[110] bg-slate-900 flex flex-col pointer-events-auto"
          >
            <div className="h-24 border-b border-white/5 flex items-center justify-between px-8 md:px-16 bg-black/50">
              <h2 className="text-2xl md:text-5xl font-black italic tracking-tighter uppercase text-white">SELECT OPERATION</h2>
              <button onClick={() => setIsModeSelectOpen(false)} className="bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition text-slate-300">
                <X className="w-8 h-8" />
              </button>
            </div>
            <div className="flex-1 p-8 md:p-16 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
               <div className="max-w-7xl mx-auto space-y-16">
                  
                  {/* Game Mode Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div 
                      onClick={() => { setSelectedMode('Default Game'); }}
                      className={`p-8 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center text-center ${selectedMode === 'Default Game' ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.2)] scale-105' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                    >
                       <Gamepad2 className="w-20 h-20 mb-6 text-white/50" />
                       <h3 className="font-black italic text-2xl mb-2 uppercase tracking-widest text-white">Default Game</h3>
                       <p className="text-sm text-slate-400">The standard experience. Battle for global supremacy and rank leaderboards.</p>
                    </div>

                    <div 
                      onClick={() => { setSelectedMode('Code Escape'); }}
                      className={`p-8 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center text-center ${selectedMode === 'Code Escape' ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.2)] scale-105' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                    >
                       <Terminal className="w-20 h-20 mb-6 text-cyan-500" />
                       <h3 className="font-black italic text-2xl mb-2 uppercase tracking-widest text-white">Code Escape</h3>
                       <p className="text-sm text-slate-400">Fast-paced lateral thinking puzzles. Beat the timer and hack the network.</p>
                       <div className="mt-4 flex items-center gap-2">
                          <span className="text-xs bg-cyan-500 text-black px-3 py-1 rounded font-black">2D INTERFACE</span>
                       </div>
                    </div>

                    <div 
                      onClick={() => { setSelectedMode('Cyber Strike'); }}
                      className={`p-8 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center text-center ${selectedMode === 'Cyber Strike' ? 'bg-red-500/20 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.2)] scale-105' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                    >
                       <Crosshair className="w-20 h-20 mb-6 text-red-500" />
                       <h3 className="font-black italic text-2xl mb-2 uppercase tracking-widest text-white">Neon Strike</h3>
                       <p className="text-sm text-slate-400">Survival shooting arena. Eliminate cyber-drones and defend your core.</p>
                       <div className="mt-4 flex items-center gap-2 text-red-500 font-black animate-pulse">
                          <Zap className="w-4 h-4" /> <span className="text-xs">HIGH INTENSITY</span>
                       </div>
                    </div>

                    <div 
                      onClick={() => { setSelectedMode('Quick Pulse'); }}
                      className={`p-8 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center text-center ${selectedMode === 'Quick Pulse' ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.2)] scale-105' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                    >
                       <Swords className="w-20 h-20 mb-6 text-blue-500" />
                       <h3 className="font-black italic text-2xl mb-2 uppercase tracking-widest text-white">Quick Pulse</h3>
                       <p className="text-sm text-slate-400">Pure reaction speed challenge. Out-click your opponent in real-time pulse combat.</p>
                       <div className="mt-4 flex items-center gap-2">
                          <span className="text-xs bg-blue-500 text-white px-3 py-1 rounded font-black">REFLEX TEST</span>
                       </div>
                    </div>
                  </div>

                  {/* Player Type Selection */}
                  <div className="pt-16 border-t border-white/10">
                    <h3 className="text-2xl font-black italic tracking-widest mb-10 text-white/40 flex items-center gap-4">
                       <Shield className="w-6 h-6" /> MATCH TYPE CONFIGURATION
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl">
                       <button 
                         onClick={() => setSelectedGameMode('SOLO')}
                         className={`p-10 rounded-[3rem] border-4 flex flex-col items-center text-center transition-all ${selectedGameMode === 'SOLO' ? 'bg-white text-black border-white shadow-[0_0_50px_rgba(255,255,255,0.2)]' : 'bg-black/60 border-white/10 text-white hover:bg-white/5'}`}
                       >
                          <Bot className={`w-24 h-24 mb-6 ${selectedGameMode === 'SOLO' ? 'text-black' : 'text-slate-400 opacity-40'}`} />
                          <span className="text-3xl font-black italic uppercase tracking-widest leading-none">Practice vs Bots</span>
                          <p className="text-sm opacity-60 mt-4 leading-relaxed font-sans max-w-xs">Perfect your precision and strategy against tactical AI agents.</p>
                       </button>

                       <button 
                         onClick={() => setSelectedGameMode('MULTI')}
                         disabled={onlineUsersCount < 5}
                         className={`relative p-10 rounded-[3rem] border-4 flex flex-col items-center text-center transition-all ${selectedGameMode === 'MULTI' ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)]' : 'bg-black/60 border-white/10 text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed group'}`}
                       >
                          <Users className={`w-24 h-24 mb-6 ${selectedGameMode === 'MULTI' ? 'text-black' : 'text-cyan-500 opacity-60 group-hover:opacity-100 transition-opacity'}`} />
                          <span className="text-3xl font-black italic uppercase tracking-widest leading-none">Global Multiplayer</span>
                          <p className="text-sm opacity-60 mt-4 leading-relaxed font-sans max-w-xs">Face off against real legends. 5+ players required for network sync.</p>
                          
                          {onlineUsersCount < 5 && (
                            <div className="absolute -bottom-4 bg-red-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-tighter shadow-lg border border-red-400">
                               Waiting for connection: {onlineUsersCount}/5 Users
                            </div>
                          )}
                       </button>
                    </div>
                  </div>

                  {/* Start Button */}
                  <div className="flex justify-center pt-8">
                    <button 
                      onClick={() => {
                        if (selectedMode === 'Code Escape') setIsCodeEscapeActive(true);
                        else if (selectedMode === 'Cyber Strike') setIsCyberStrikeActive(true);
                        else if (selectedMode === 'Quick Pulse') setIsQuickPulseActive(true);
                        setIsModeSelectOpen(false);
                      }}
                      disabled={!selectedGameMode}
                      className="group relative px-24 py-10 bg-yellow-400 rounded-3xl font-black italic text-5xl text-black hover:bg-yellow-300 disabled:opacity-30 disabled:grayscale transition-all shadow-[0_30px_60px_rgba(250,204,21,0.25)] hover:-translate-y-2 active:translate-y-0 active:shadow-none"
                    >
                      <div className="flex items-center gap-6">
                         INITIALIZE
                         <Zap className="w-12 h-12 group-hover:scale-125 transition-transform" />
                      </div>
                      <div className="absolute -inset-1 bg-yellow-400 opacity-20 blur-2xl group-hover:opacity-40 transition-opacity -z-10"></div>
                    </button>
                  </div>

               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChatOpen(false)} className="absolute inset-0 bg-black/40 z-30 md:bg-transparent" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute top-[80px] left-4 md:left-20 h-auto md:h-[60vh] max-h-[500px] rounded-2xl w-[90%] md:w-4/5 max-w-sm bg-black/80 backdrop-blur-xl border border-white/10 z-40 flex flex-col shadow-2xl pb-4">
              <div className="flex justify-between items-center p-3 border-b border-white/10 text-xs font-bold uppercase tracking-widest text-blue-400">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Global Chat</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/10 rounded-md transition text-slate-300"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {chatMessages.length === 0 ? (
                  <div className="text-slate-500 text-xs text-center mt-4">No messages yet. Start the conversation!</div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={msg.id || i} className={`text-sm flex flex-col gap-1 p-2 rounded-lg transition-colors ${msg.isAlert ? 'bg-amber-500/10 border border-amber-500/20 my-1 animate-pulse' : 'items-start flex-row gap-1'}`}>
                      {msg.isAlert ? (
                         <div className="flex items-center gap-2 mb-1">
                            <ShieldAlert className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{msg.username}</span>
                         </div>
                      ) : (
                        <span 
                          onClick={() => setViewingUserId(msg.userId)}
                          className={`font-bold flex items-center gap-1 shrink-0 cursor-pointer hover:underline ${msg.userId === user?.uid ? 'text-green-400' : 'text-blue-400'}`}
                        >
                          [{msg.username}]
                          {(msg.isVerified || (msg.userId === user?.uid && isOwner)) && <BadgeCheck className="w-3 h-3 text-blue-400" />}
                          :
                        </span>
                      )}
                      <span className={`${msg.isAlert ? 'text-amber-200 font-bold italic' : 'text-slate-300'} break-words flex-1 mt-0.5`}>{msg.msg}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 mx-4 border border-white/10 bg-white/5 rounded-xl shrink-0">
                <div className="flex">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="bg-transparent text-sm w-full outline-none text-slate-200 placeholder-slate-500" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFriendsOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFriendsOpen(false)} className="absolute inset-0 bg-black/40 z-30 md:bg-transparent" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute top-[80px] right-4 md:right-20 h-auto max-h-[70vh] rounded-2xl w-[90%] md:w-4/5 max-w-sm bg-black/80 backdrop-blur-xl border border-white/10 z-40 flex flex-col shadow-2xl pb-4">
              <div className="flex justify-between items-center p-3 border-b border-white/10 text-xs font-bold uppercase tracking-widest text-purple-400 shrink-0">
                <div className="flex items-center gap-2 text-purple-400"><Users className="w-4 h-4" /><span>Social</span></div>
                <button onClick={() => setIsFriendsOpen(false)} className="p-1 hover:bg-white/10 rounded-md transition text-slate-300"><X className="w-4 h-4" /></button>
              </div>
              
              {/* Search */}
              <div className="p-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2 bg-white/5 rounded-full border border-white/10 px-3 py-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    className="bg-transparent text-sm w-full outline-none text-slate-200 placeholder-slate-500" 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); handleSearchUsers(); }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {/* Search Results */}
                {searchQuery.length > 2 && (
                  <div className="mb-4">
                    <div className="text-xs font-bold text-slate-500 px-3 py-2 uppercase tracking-wider">Search Results</div>
                    {searchResults.length === 0 ? <div className="text-xs text-slate-500 px-3">No users found.</div> : 
                      searchResults.map((sr, i) => {
                        const isFriend = friendsList.find(f => f.friendId === sr.userId);
                        return (
                          <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition">
                            <div className="text-sm font-bold cursor-pointer hover:text-white transition" onClick={() => setViewingUserId(sr.userId)}>{sr.username}</div>
                            {isFriend ? (
                              <span className="text-xs text-green-400 font-bold px-2">Friend</span>
                            ) : (
                              <button onClick={() => handleSendFriendRequest(sr.userId, sr.username)} className="text-xs bg-white/10 px-3 py-1 rounded-full font-semibold border border-white/10 hover:bg-white/20">Add</button>
                            )}
                          </div>
                      )})
                    }
                  </div>
                )}

                {/* Friend Requests */}
                {friendRequests.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-bold text-rose-400 px-3 py-2 uppercase tracking-wider">Requests ({friendRequests.length})</div>
                    {friendRequests.map((req, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/10 mb-2">
                        <div className="text-sm font-bold text-white">{req.fromUsername}</div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAcceptRequest(req)} className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full font-bold hover:bg-green-500/30">Accept</button>
                          <button onClick={() => handleRejectRequest(req.id)} className="text-xs bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full font-bold hover:bg-rose-500/30">Deny</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Friends List */}
                <div className="mb-4">
                  <div className="text-xs font-bold text-purple-400 px-3 py-2 uppercase tracking-wider">Friends ({friendsList.length})</div>
                  {friendsList.length === 0 && !searchQuery ? <div className="text-xs text-slate-500 px-3 py-2">No friends yet. Add players below!</div> : null}
                  {friendsList.map((friend, i) => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl cursor-pointer transition" onClick={() => setViewingUserId(friend.friendId)}>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={friend.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.friendUsername}&backgroundColor=b6e3f4`} className="w-8 h-8 rounded-full bg-slate-800 object-cover" />
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900"></div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="text-sm font-bold">{friend.friendUsername}</div>
                          {friend.friendEmail === OWNER_EMAIL && <BadgeCheck className="w-3 h-3 text-blue-400" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* All Players */}
                {!searchQuery && suggestedUsers.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-slate-500 px-3 py-4 uppercase tracking-wider mt-2 border-t border-slate-800/50">All Players</div>
                    {suggestedUsers.map((su, i) => {
                      const isFriend = friendsList.find(f => f.friendId === su.userId);
                      if (isFriend) return null; // Don't show existing friends in "All Players"
                      
                      return (
                         <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition">
                           <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setViewingUserId(su.userId)}>
                              <img src={su.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${su.username}&backgroundColor=b6e3f4`} alt="" className="w-8 h-8 rounded-full bg-slate-800 object-cover group-hover:brightness-110 transition" />
                              <div className="flex items-center gap-1">
                                <div className="text-sm font-bold opacity-80 group-hover:opacity-100 transition">{su.username}</div>
                                {(su.isVerified || su.email === OWNER_EMAIL) && <BadgeCheck className="w-3 h-3 text-blue-400" />}
                              </div>
                           </div>
                           <button onClick={() => handleSendFriendRequest(su.userId, su.username)} className="text-xs bg-white/10 px-3 py-1 rounded-full font-semibold border border-white/10 hover:bg-white/20 text-slate-300">Add</button>
                         </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingUserId && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[60] bg-slate-900/98 backdrop-blur-3xl overflow-y-auto pointer-events-auto flex flex-col items-center p-4 py-16 md:p-8"
          >
            <button 
              onClick={() => setViewingUserId(null)} 
              className="absolute top-4 right-4 md:fixed md:top-8 md:right-8 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-slate-300 z-50"
            >
              <X className="w-6 h-6 md:w-8 md:h-8" />
            </button>

            {isViewingProfileLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin w-12 h-12 text-blue-500 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest italic">Loading Profile...</p>
              </div>
            ) : viewingUserProfile ? (() => {
              const isOwnerProfile = viewingUserProfile.email === OWNER_EMAIL;
              const vSkin = PROFILE_SKINS.find(s => s.id === viewingUserProfile.equippedSkin);
              const vRank = getCurrentRank(viewingUserProfile.level || 1);
              
              return (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, rotateY: isOwnerProfile ? 20 : 0 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className={`w-full max-w-4xl bg-black/60 backdrop-blur-md rounded-3xl border transition-all duration-700 relative overflow-hidden shadow-2xl 
                    ${isOwnerProfile ? 'border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.3)]' : (vSkin ? `${vSkin.border} ${vSkin.glow} animate-[pulse_3s_infinite]` : 'border-white/10')}
                    ${vSkin || isOwnerProfile ? 'pt-32 md:pt-48 pb-10' : 'p-6 md:p-10'}
                  `}
                >
                  {/* Decorative Elements for Owner */}
                  {isOwnerProfile && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-[shimmer_2s_infinite]"></div>
                      <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/20 blur-[100px] rounded-full animate-pulse"></div>
                    </>
                  )}

                  {/* Decorative Glow */}
                  <div className={`absolute top-0 right-0 w-80 h-80 ${isOwnerProfile ? 'bg-amber-500' : (vSkin ? vSkin.bg : 'bg-blue-500')}/10 blur-3xl rounded-full pointer-events-none`}></div>
                  
                  {(vSkin || isOwnerProfile) && (
                    <div className={`absolute top-0 left-0 right-0 h-48 md:h-64 ${isOwnerProfile ? 'bg-[url(https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1920)] bg-cover' : vSkin?.className} opacity-80 pointer-events-none`}>
                       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                    </div>
                  )}

                  <div className={`flex flex-col items-center relative z-10 w-full ${(vSkin || isOwnerProfile) ? 'px-6 md:px-10 -mt-20 md:-mt-24' : ''}`}>
                    <div className="relative mb-6">
                      <motion.div 
                        animate={isOwnerProfile ? { 
                          boxShadow: ["0 0 20px rgba(245,158,11,0.2)", "0 0 40px rgba(245,158,11,0.5)", "0 0 20px rgba(245,158,11,0.2)"],
                        } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="relative"
                      >
                        <img 
                          src={viewingUserProfile.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewingUserProfile.username}&backgroundColor=b6e3f4`} 
                          className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-4 ${isOwnerProfile ? 'border-amber-500' : (vSkin ? vSkin.border : vRank.borderColor)} bg-slate-800 shadow-2xl object-cover transition-all duration-500`} 
                          alt="Avatar" 
                        />
                        {isOwnerProfile && (
                          <div className="absolute -inset-2 bg-amber-500/20 rounded-full blur-md -z-10 animate-pulse"></div>
                        )}
                        <div className={`absolute -bottom-2 -right-2 ${isOwnerProfile ? 'bg-amber-500' : (vSkin ? vSkin.bg : vRank.badgeColor)} border-4 border-slate-900 text-white p-2 rounded-full shadow-lg`}>
                          {isOwnerProfile ? <ShieldAlert className="w-5 h-5 text-black" /> : vRank.smallIcon}
                        </div>
                      </motion.div>
                    </div>

                    <div className="flex flex-col items-center">
                      {isOwnerProfile ? (
                        <div className="flex items-center gap-2 mb-2 bg-amber-500/10 border border-amber-500/30 px-4 py-1 rounded-full">
                          <Crown className="w-4 h-4 text-amber-500 animate-bounce" />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">System Owner</span>
                        </div>
                      ) : (
                        <div className={`text-xs font-black uppercase tracking-[0.2em] mb-2 ${vSkin ? vSkin.accent : 'text-slate-400'}`}>
                          {vRank.name} Level {viewingUserProfile.level || 1}
                        </div>
                      )}
                      
                      <h2 className="text-4xl md:text-6xl font-black italic tracking-widest text-white mb-2 uppercase text-center flex items-center justify-center gap-3">
                        <span className={`${isOwnerProfile ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400' : (vSkin ? vSkin.accent : '')} transition-colors duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]`}>
                          {viewingUserProfile.username}
                        </span>
                        {(viewingUserProfile.isVerified || isOwnerProfile) && <BadgeCheck className="w-8 h-8 text-amber-400" />}
                      </h2>
                      
                      <div className="flex items-center gap-2 mb-8">
                         <div className={`h-px w-8 ${isOwnerProfile ? 'bg-amber-500/30' : 'bg-white/10'}`}></div>
                         <div className={`${isOwnerProfile ? 'text-amber-500' : 'text-slate-500'} font-bold text-[10px] uppercase tracking-widest`}>
                            {isOwnerProfile ? 'God Mode Enabled' : 'Profile View'}
                         </div>
                         <div className={`h-px w-8 ${isOwnerProfile ? 'bg-amber-500/30' : 'bg-white/10'}`}></div>
                      </div>
                    </div>

                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Bio Section */}
                      <motion.div 
                        whileHover={isOwnerProfile ? { scale: 1.02, backgroundColor: 'rgba(245,158,11,0.05)' } : {}}
                        className={`bg-black/60 rounded-2xl p-6 border transition-all duration-500 ${isOwnerProfile ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : (vSkin ? vSkin.border : 'border-white/5')}`}
                      >
                        <span className={`text-[10px] font-black uppercase tracking-widest mb-4 block ${isOwnerProfile ? 'text-amber-400' : (vSkin ? vSkin.accent : 'text-slate-500')}`}>Biography</span>
                        <p className={`text-sm md:text-base leading-relaxed italic ${isOwnerProfile ? 'text-amber-100/90' : 'text-slate-300'}`}>
                          {viewingUserProfile.bio || (isOwnerProfile ? "The architect behind this digital world." : "This user hasn't added a bio yet.")}
                        </p>
                      </motion.div>

                      {/* Stats Section */}
                      <motion.div 
                        whileHover={isOwnerProfile ? { scale: 1.02, backgroundColor: 'rgba(6,182,212,0.05)' } : {}}
                        className={`bg-black/60 rounded-2xl p-6 border transition-all duration-500 ${isOwnerProfile ? 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : (vSkin ? vSkin.border : 'border-white/5')}`}
                      >
                        <span className={`text-[10px] font-black uppercase tracking-widest mb-4 block ${isOwnerProfile ? 'text-cyan-400' : (vSkin ? vSkin.accent : 'text-slate-500')}`}>Statistics</span>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white/5 p-3 rounded-xl border border-white/5 overflow-hidden relative group">
                              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Coins</div>
                              <div className={`font-black italic text-xl ${isOwnerProfile ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`}>{viewingUserProfile.coins?.toLocaleString() || 0}</div>
                              {isOwnerProfile && <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-opacity"><Coins className="w-12 h-12 text-amber-500" /></div>}
                           </div>
                           <div className="bg-white/5 p-3 rounded-xl border border-white/5 overflow-hidden relative group">
                              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Skins</div>
                              <div className="font-black italic text-purple-400 text-xl">{viewingUserProfile.purchasedSkins?.length || 0}</div>
                              {isOwnerProfile && <div className="absolute -right-2 -bottom-2 opacity-10"><Sparkles className="w-12 h-12 text-purple-500" /></div>}
                           </div>
                           <div className="bg-white/5 p-3 rounded-xl border border-white/5 col-span-2">
                              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Member Since</div>
                              <div className={`font-bold text-xs ${isOwnerProfile ? 'text-amber-200' : 'text-slate-300'}`}>
                                {viewingUserProfile.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    </div>
                    
                    {/* Skin Showcase */}
                    {viewingUserProfile.purchasedSkins?.length > 0 && (
                      <div className="w-full mt-6">
                         <div className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isOwnerProfile ? 'text-amber-400' : (vSkin ? vSkin.accent : 'text-slate-500')}`}>Legacy Collection</div>
                         <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                           {PROFILE_SKINS.filter(s => viewingUserProfile.purchasedSkins?.includes(s.id)).map(s => (
                             <div key={s.id} className={`w-32 shrink-0 h-16 rounded-lg ${s.className} border ${viewingUserProfile.equippedSkin === s.id ? 'border-white ring-2 ring-white/20' : 'border-white/10 opacity-70'} overflow-hidden relative`}>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                   <span className="text-[8px] font-black uppercase tracking-wider text-white text-center px-1">{s.name}</span>
                                </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    )}

                    <div className="mt-10 flex gap-4">
                       <button 
                         onClick={() => setViewingUserId(null)}
                         className={`px-10 py-4 rounded-2xl font-black italic tracking-widest uppercase transition-all shadow-xl hover:-translate-y-1 
                            ${isOwnerProfile ? 'bg-gradient-to-r from-amber-600 to-amber-400 text-black scale-110 shadow-amber-500/40 hover:shadow-amber-500/60' : (vSkin ? vSkin.bg + ' text-white hover:opacity-90' : 'bg-white text-black hover:bg-slate-200')}
                         `}
                       >
                         {isOwnerProfile ? 'Exit Master Portal' : 'Close Profile'}
                       </button>
                    </div>
                  </div>
                </motion.div>
              );
            })() : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <X className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest italic">User not found.</p>
                <button onClick={() => setViewingUserId(null)} className="mt-4 text-blue-400 font-bold hover:underline">Go back</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <AnimatePresence>
        {isAdminOpen && user && <AdminPanel adminUid={user.uid} onClose={() => setIsAdminOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showAuth && !user && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <div className="w-full max-w-sm bg-[#0A0B10] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-2xl font-black italic tracking-tighter text-white mb-6 text-center">
                {isLogin ? 'LOGIN' : 'SIGN UP'}
              </h2>
              {authError && <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-xs text-center">{authError}</div>}
              
              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Username</label>
                    <input 
                      type="text" 
                      required
                      value={username} onChange={e => setUsername(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-blue-500/50" 
                      placeholder="ProGamer123"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Email</label>
                  <input 
                    type="email" 
                    required
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-blue-500/50" 
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Password</label>
                  <input 
                    type="password" 
                    required
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-blue-500/50" 
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-colors mt-2">
                  {isLogin ? 'Play Now' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => { setIsLogin(!isLogin); setAuthError(''); }}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
