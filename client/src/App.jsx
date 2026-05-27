import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Input } from './components/input';
import { Button } from './components/ui/button';
import { 
  Check, Trash2, LogOut, Code2, Play, ShoppingBag, 
  Coins, Trophy, Terminal, Sparkles, User, HelpCircle, 
  ChevronRight, RefreshCw, AlertCircle 
} from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import CustomizerShop from './components/CustomizerShop';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  return (
    <>
      {/* Global scanline and CRT filter overlay for the entire experience */}
      <div className="crt-overlay" />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <LoginPage setToken={setToken} />} />
          <Route path="/dashboard" element={token ? <Dashboard token={token} setToken={setToken} /> : <Navigate to="/login" />} />
        </Routes>
      </Router>
    </>
  );
}

// PREMIUM RETRO LANDING PORTAL
function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="text-center rounded-2xl bg-black/60 p-10 sm:p-14 max-w-lg border border-purple-500/20 shadow-[0_0_35px_rgba(139,92,246,0.15)] backdrop-blur-2xl flex flex-col items-center relative overflow-hidden neon-pulse-pink">
      {/* Animated glowing backgrid */}
      <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="inline-flex p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl mb-4 animate-pulse">
          <Terminal className="w-10 h-10 text-pink-400" />
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-[0.25em] uppercase font-mono mb-2 glow-text-pink">
          THE LINKER
        </h1>
        <p className="text-cyan-400/80 text-xs font-mono tracking-widest uppercase mb-6">
          Procedural Grid Surf Engine
        </p>
        
        <p className="text-gray-400 text-sm font-light mb-8 max-w-sm leading-relaxed">
          Log in to decrypt system cores, collect Data Shards, customize your Linker robotic chassis, and compete on the global grid leaderboards.
        </p>
        
        <Button 
          onClick={() => navigate('/login')} 
          className="h-13 px-10 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 border border-white/20 text-white font-mono font-bold tracking-widest text-xs uppercase rounded-full shadow-[0_0_15px_rgba(236,72,153,0.4)] transition-all duration-300 transform hover:scale-[1.04]"
        >
          CONNECT ACCESS PORTAL <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

// PREMIUM LOGIN / REGISTER PORTAL
function LoginPage({ setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Credentials cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Authentication rejected');
        setLoading(false);
        return;
      }
      
      if (isLogin) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        navigate('/dashboard');
      } else {
        setIsLogin(true);
        setError('System node registered. Enter access codes.');
      }
    } catch (err) {
      setError('Access connection failed. Check server status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-w-[340px] max-w-sm rounded-2xl bg-black/60 p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)] border border-cyan-500/20 backdrop-blur-2xl relative overflow-hidden neon-pulse-cyan">
      <div className="absolute inset-0 cyber-grid-bg opacity-15 pointer-events-none" />

      <div className="relative z-10">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white tracking-[0.2em] uppercase font-mono mb-2 glow-text-cyan">
            {isLogin ? 'DECRYPT' : 'REGISTER'}
          </h1>
          <p className="text-gray-400 text-xs font-mono tracking-widest uppercase">
            {isLogin ? 'Security Access Authentication' : 'Create System Credentials'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <Input 
              type="text" 
              placeholder="NETWORK ALIAS" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="bg-black/40 border border-white/10 font-mono text-center placeholder:text-gray-600 focus-visible:ring-cyan-500"
            />
            <Input 
              type="password" 
              placeholder="SECURE ACCESS PHRASE" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="bg-black/40 border border-white/10 font-mono text-center placeholder:text-gray-600 focus-visible:ring-cyan-500"
            />
          </div>

          {error && (
            <div className="text-rose-400 text-xs font-mono text-center bg-rose-500/5 p-2.5 rounded border border-rose-500/20">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 border border-white/15 text-white font-mono font-bold tracking-widest text-xs uppercase rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all"
          >
            {loading ? 'INITIALIZING TERMINAL...' : isLogin ? 'BYPASS FIREWALL' : 'REGISTER ACCESS NODE'}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs font-mono text-gray-500">
          {isLogin ? "LACK CREDENTIALS? " : "ALREADY REGISTERED? "}
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            className="text-cyan-400 hover:text-cyan-300 font-bold ml-1 transition-all"
          >
            {isLogin ? 'INITIALIZE NEW NODE' : 'SIGN IN PORT'}
          </button>
        </div>
      </div>
    </div>
  );
}

// PREMIUM CORE MULTI-TAB CYBER TERMINAL & GAMING HUB
function Dashboard({ token, setToken }) {
  const [activeTab, setActiveTab] = useState('game'); // game, shop, tasks, leaderboard
  const [userProfile, setUserProfile] = useState(null);
  
  // Decryption queue states
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [filter, setFilter] = useState('all');
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [shardNotification, setShardNotification] = useState(null);
  
  // Leaderboard states
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // 1. FETCH PROFILE ON MOUNT & UPDATE CALLBACKS
  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.user);
      } else if (res.status === 401) {
        logout();
      }
    } catch (err) {
      console.error('Failed to sync profile metrics.');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  // 2. RUN FINISH SYNC CALLBACK
  const handleGameSync = (updatedShards, updatedHighScore) => {
    if (userProfile) {
      setUserProfile(prev => ({
        ...prev,
        data_shards: updatedShards,
        high_score: updatedHighScore
      }));
    }
  };

  // 3. SECURE SHARDS NOTIFICATION TRIGGERS
  const triggerShardNotification = (amount) => {
    setShardNotification(amount);
    setTimeout(() => setShardNotification(null), 3000);
  };

  // 4. DECRYPTION TASKS CONTROLLER
  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Tasks synchronizer offline.');
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    }
  }, [activeTab]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, description: desc })
      });
      
      if (res.ok) {
        setTitle('');
        setDesc('');
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTask = async (id, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        // Award shards if task was successfully completed!
        if (data.shardsAwarded) {
          triggerShardNotification(data.shardsAwarded);
          fetchProfile(); // Refreshes Shard wallet instantly
        }
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  // 5. ARCADE LEADERBOARD CONTROLLER
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Leaderboard system offline.');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  return (
    <div className="w-full max-w-5xl px-4 py-8">
      {/* SHARDS SECURED FLOATING TOAST overlay */}
      {shardNotification && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-500 to-teal-500 border border-emerald-400/30 px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)] font-mono text-sm text-white font-bold tracking-widest flex items-center gap-2 animate-bounce">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
          <span>DECRYPTION SECURED! +{shardNotification} SHARDS SECURED</span>
        </div>
      )}

      {/* TOP DECK: SYSTEM STATUS HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-cyan-500 to-pink-500 rounded-xl neon-pulse-cyan">
              <Code2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-[0.2em] uppercase font-mono glow-text-cyan">
                AURA NET
              </h1>
              <p className="text-gray-500 text-[10px] font-mono tracking-widest uppercase">System Core Version 1.0.0 // Decrypt Terminal</p>
            </div>
          </div>
        </div>

        {/* PROFILE STATS HUD */}
        {userProfile && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl font-mono text-xs">
              <span className="text-gray-500 block text-[9px] uppercase tracking-widest">ACTIVE NODE</span>
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> {userProfile.username.toUpperCase()}
              </span>
            </div>

            <div className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl font-mono text-xs">
              <span className="text-gray-500 block text-[9px] uppercase tracking-widest">HIGHEST RECORD</span>
              <span className="text-purple-400 font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> {userProfile.high_score} pts
              </span>
            </div>

            <div className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl font-mono text-xs">
              <span className="text-gray-500 block text-[9px] uppercase tracking-widest">DATA SHARDS</span>
              <span className="text-pink-400 font-bold flex items-center gap-1 animate-pulse">
                <Coins className="w-3.5 h-3.5" /> {userProfile.data_shards}
              </span>
            </div>

            <Button 
              onClick={logout} 
              className="bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-500/20 font-mono text-xs rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-1.5" /> DISCONNECT
            </Button>
          </div>
        )}
      </div>

      {/* MID DECK: TAB SELECT NAVIGATION BAR */}
      <div className="flex gap-2 mb-8 border-b border-white/5 pb-4 overflow-x-auto custom-scrollbar">
        {[
          { id: 'game', name: 'Surf Streams', icon: Play },
          { id: 'shop', name: 'Chassis Shop', icon: ShoppingBag },
          { id: 'tasks', name: 'Decrypt Queue', icon: Terminal },
          { id: 'leaderboard', name: 'Scoreboard', icon: Trophy }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-xl font-mono text-xs uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500/10 to-pink-500/10 text-white border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'bg-transparent text-gray-500 border border-transparent hover:text-gray-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-pink-400' : 'text-gray-500'}`} /> {tab.name}
            </button>
          );
        })}
      </div>

      {/* CORE DISPLAY DECKS (TABS SWITCHER) */}
      <div className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 cyber-grid-bg opacity-[0.04] pointer-events-none" />
        
        {/* GAME STREAM TAB */}
        {activeTab === 'game' && (
          <div className="p-4 sm:p-6 relative z-10">
            <div className="mb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <h3 className="text-lg font-mono tracking-widest text-cyan-400 uppercase">Interactive Spline Grid Network</h3>
              <p className="text-gray-500 text-xs font-mono">LINK STACK READY // SURF GRID ACTIVE</p>
            </div>
            
            <GameCanvas 
              token={token} 
              userProfile={userProfile} 
              onGameSync={handleGameSync} 
            />
          </div>
        )}

        {/* CUSTOM SHOP TAB */}
        {activeTab === 'shop' && (
          <div className="p-4 sm:p-6 relative z-10">
            <CustomizerShop 
              token={token} 
              userProfile={userProfile} 
              onProfileUpdate={setUserProfile} 
            />
          </div>
        )}

        {/* DECRYPTION TASKS QUEUE (AWARDING SHARDS!) */}
        {activeTab === 'tasks' && (
          <div className="p-6 relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-mono tracking-widest text-cyan-400 uppercase">System Decryption Queue</h3>
                <p className="text-gray-500 text-xs font-mono mt-1">Completing decryption sequences awards +25 Data Shards to your core wallet.</p>
              </div>
              <Button 
                onClick={fetchTasks} 
                disabled={loadingTasks}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs rounded-xl"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTasks ? 'animate-spin' : ''}`} /> Sync Tasks
              </Button>
            </div>

            {/* Task Add Form */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5 mb-8">
              <form onSubmit={addTask} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    type="text" 
                    placeholder="DECRYPTION TITLE (e.g. Clean compiler logs)" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="bg-black/30 border border-white/5 font-mono placeholder:text-gray-600 focus-visible:ring-cyan-500"
                  />
                  <Input 
                    type="text" 
                    placeholder="DECRYPTION SPECS (e.g. Line 25 debug)" 
                    value={desc} 
                    onChange={(e) => setDesc(e.target.value)} 
                    className="bg-black/30 border border-white/5 font-mono placeholder:text-gray-600 focus-visible:ring-cyan-500"
                  />
                </div>
                <Button type="submit" className="w-full bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/30 transition-all font-mono tracking-widest text-xs uppercase">
                  INITIALIZE SYSTEM TASK (+25 Shards Pending)
                </Button>
              </form>
            </div>

            {/* Task filter selection */}
            <div className="mb-6 flex gap-2">
              {['all', 'pending', 'completed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono tracking-wider transition-all ${
                    filter === f 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.1)]' 
                      : 'bg-transparent text-gray-500 border border-transparent hover:text-gray-300'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Tasks list */}
            {loadingTasks ? (
              <div className="text-center p-12 text-gray-500 font-mono text-sm animate-pulse">
                DECRYPTING QUEUE STACK...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center p-12 text-gray-500 font-mono text-xs border border-white/5 border-dashed rounded-xl">
                {filter === 'all' ? "SYSTEM CORE EMPTY. INITIALIZE A TASK TO BEGIN GENERATING SHARDS." : `NO ${filter.toUpperCase()} SEQUENCES ISOLATED.`}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                      task.status === 'completed' 
                        ? 'bg-black/10 border-white/5 opacity-50' 
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-cyan-500/20'
                    }`}
                  >
                    <button 
                      onClick={() => toggleTask(task.id, task.status)}
                      className={`mt-1 flex-shrink-0 w-6 h-6 rounded flex items-center justify-center border transition-all ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                          : 'border-gray-700 bg-black/40 text-transparent hover:border-gray-500'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-mono text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                        {task.title.toUpperCase()}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-gray-500 font-mono mt-1">{task.description.toLowerCase()}</p>
                      )}
                    </div>

                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="text-gray-600 hover:text-rose-400 p-2 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ARCADE LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div className="p-6 relative z-10">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-mono tracking-widest text-cyan-400 uppercase">System Core Decrypt scoreboard</h3>
                <p className="text-gray-500 text-xs font-mono mt-1">High-score compiler records of the top 10 Linkers in the network.</p>
              </div>
              <Button 
                onClick={fetchLeaderboard} 
                disabled={loadingLeaderboard}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs rounded-xl"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLeaderboard ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>

            {loadingLeaderboard ? (
              <div className="text-center p-12 text-gray-500 font-mono text-sm animate-pulse">
                CONTACTING LEADERBOARD NODE STACK...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center p-12 text-gray-500 font-mono text-xs border border-white/5 border-dashed rounded-xl">
                LEADERBOARD EMPTY. CONNECT A GAME RUN TO DECRYPT FIRST ENTRY.
              </div>
            ) : (
              <div className="border border-white/5 rounded-xl overflow-hidden font-mono bg-black/20">
                <div className="grid grid-cols-12 bg-white/[0.03] border-b border-white/5 p-4 text-[10px] text-gray-500 uppercase tracking-widest">
                  <div className="col-span-2 text-center">RANK</div>
                  <div className="col-span-6">LINKER NETWORK ALIAS</div>
                  <div className="col-span-4 text-right">HIGHEST RECORD SCORE</div>
                </div>

                <div className="divide-y divide-white/5">
                  {leaderboard.map((player, idx) => {
                    const isTop3 = idx < 3;
                    const rankColors = ['text-yellow-400 font-bold', 'text-gray-300 font-bold', 'text-amber-600 font-bold'];
                    
                    return (
                      <div 
                        key={idx} 
                        className={`grid grid-cols-12 p-4 text-sm items-center transition-all ${
                          userProfile && player.username === userProfile.username
                            ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border-l-2 border-cyan-400' 
                            : 'hover:bg-white/[0.01]'
                        }`}
                      >
                        <div className={`col-span-2 text-center text-xs ${isTop3 ? rankColors[idx] : 'text-gray-500'}`}>
                          {idx + 1 === 1 ? '🥇 01' : idx + 1 === 2 ? '🥈 02' : idx + 1 === 3 ? '🥉 03' : `${idx + 1 < 10 ? '0' : ''}${idx + 1}`}
                        </div>
                        <div className={`col-span-6 font-bold ${isTop3 ? 'text-white' : 'text-gray-300'} uppercase tracking-wider`}>
                          {player.username}
                        </div>
                        <div className={`col-span-4 text-right font-bold font-mono ${isTop3 ? 'text-cyan-300 glow-text-cyan' : 'text-gray-400'}`}>
                          {player.high_score.toLocaleString()} PTS
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
