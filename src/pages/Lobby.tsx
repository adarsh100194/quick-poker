import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../lib/firebase';
import type { GameState } from '../lib/gameService';
import { startNextRound } from '../lib/gameService';
import { usePlayerStore } from '../store/playerStore';
import { Copy, Check, Users, Play } from 'lucide-react';

export default function Lobby() {
    const { code } = useParams();
    const navigate = useNavigate();
    const { playerId, isHost } = usePlayerStore();

    const [gameState, setGameState] = useState<GameState | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [isStarting, setIsStarting] = useState(false);

    // Protect route
    useEffect(() => {
        if (!playerId || !code) {
            navigate('/join');
        }
    }, [playerId, code, navigate]);

    // Firebase Real-time Listener
    useEffect(() => {
        if (!code) return;

        const gameRef = ref(database, `games/${code}`);

        // Subscribe to changes
        onValue(gameRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val() as GameState;
                setGameState(data);

                // Auto-navigate if host starts the game
                if (data.status === 'playing') {
                    navigate(`/table/${code}`);
                }
            } else {
                setError('Game not found or has been closed.');
            }
        }, (err) => {
            console.error(err);
            setError('Connection to game lost.');
        });

        // Cleanup subscription on unmount
        return () => {
            off(gameRef);
        };
    }, [code, navigate]);

    const copyToClipboard = () => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStartGame = async () => {
        if (!code || isStarting) return;
        setIsStarting(true);
        try {
            await startNextRound(code);
        } catch (e: any) {
            setError(e.message || 'Failed to start game');
            setIsStarting(false);
        }
    };

    if (error) {
        return (
            <div className="flex flex-col min-h-[100dvh] p-6 bg-slate-950 items-center justify-center text-center">
                <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-xl mb-6">
                    {error}
                </div>
                <Link to="/" className="w-full max-w-xs py-4 rounded-xl bg-slate-800 text-white font-bold">
                    Return Home
                </Link>
            </div>
        );
    }

    if (!gameState) {
        return (
            <div className="flex flex-col min-h-[100dvh] bg-slate-950 items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-slate-700 border-t-rose-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-400 font-medium">Connecting to lobby...</p>
                </div>
            </div>
        );
    }

    const playersList = Object.values(gameState.players);
    const playerCount = playersList.length;
    const maxPlayers = gameState.settings.maxPlayers;

    return (
        <div className="flex flex-col min-h-[100dvh] p-6 bg-slate-950 selection:bg-rose-500/30">
            <header className="mb-8 pt-4 flex flex-col items-center relative">
                <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Invite Code</h2>

                <button
                    onClick={copyToClipboard}
                    className="group relative flex items-center justify-center gap-4 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 px-8 py-4 rounded-2xl transition-all w-full max-w-xs"
                >
                    <span className="text-4xl font-mono font-black tracking-[0.2em] text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                        {code}
                    </span>
                    <div className="absolute -right-3 -top-3 bg-slate-800 p-2 rounded-xl text-slate-300 group-hover:bg-slate-700 group-hover:text-white transition-colors border border-slate-700 shadow-xl">
                        {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                    </div>
                </button>
                <p className="text-slate-500 text-xs mt-4">Tap code to copy and share with friends</p>
            </header>

            <main className="flex-1 flex flex-col w-full max-w-md mx-auto h-full">

                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-rose-500" />
                        Players
                    </h3>
                    <span className="text-sm font-medium px-3 py-1 bg-slate-900 rounded-full text-slate-400 border border-slate-800">
                        {playerCount} / {maxPlayers}
                    </span>
                </div>

                <div className="bg-slate-900/50 rounded-2xl p-2 flex-1 border border-slate-800/50 mb-6 overflow-y-auto max-h-[40vh]">
                    <ul className="space-y-2">
                        {playersList.map((player) => (
                            <li key={player.id} className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold opacity-80 border-2 ${player.id === playerId ? 'border-rose-500' : 'border-transparent'}`}>
                                        {player.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <span className="font-bold text-white block">{player.name} {player.id === playerId && '(You)'}</span>
                                        <span className="text-xs text-slate-500 font-mono">{player.balance.toLocaleString()} chips</span>
                                    </div>
                                </div>
                                {player.isHost && (
                                    <span className="text-[10px] bg-rose-500/20 border border-rose-500/30 text-rose-400 px-2 py-1 flex items-center rounded uppercase font-black tracking-wider">
                                        Host
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                {isHost ? (
                    <button
                        onClick={handleStartGame}
                        disabled={playerCount < 2 || isStarting}
                        className="w-full text-center flex items-center justify-center py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-[0_0_30px_rgba(5,150,105,0.3)] text-white font-bold text-lg disabled:opacity-50 disabled:shadow-none"
                    >
                        {playerCount < 2 ? 'Waiting for players...' : isStarting ? 'Starting...' : (
                            <><Play className="w-6 h-6 mr-2 fill-current" /> Start Game</>
                        )}
                    </button>
                ) : (
                    <div className="w-full text-center py-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin"></div>
                            Waiting for host to start...
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
