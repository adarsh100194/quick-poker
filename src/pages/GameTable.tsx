import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../lib/firebase';
import type { GameState } from '../lib/gameService';
import { submitPlayerAction, startNextRound } from '../lib/gameService';
import { usePlayerStore } from '../store/playerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useSoundEffects } from '../hooks/useSoundEffects';

export default function GameTable() {
    const { code } = useParams();
    const navigate = useNavigate();
    const { playerId } = usePlayerStore();
    const isHost = usePlayerStore(state => state.isHost);
    const soundEnabled = usePlayerStore(state => state.soundEnabled);
    const toggleSound = usePlayerStore(state => state.actions.toggleSound);
    const { playSound } = useSoundEffects();

    const [gameState, setGameState] = useState<GameState | null>(null);
    const [raiseAmount, setRaiseAmount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recommendation, setRecommendation] = useState<string>('');
    const [isThinking, setIsThinking] = useState(false);

    const previousTurnRef = useRef<string | null>(null);
    const previousStreetRef = useRef<string | null>(null);

    useEffect(() => {
        if (!playerId || !code) {
            navigate('/join');
        }
    }, [playerId, code, navigate]);

    useEffect(() => {
        if (!code) return;
        const gameRef = ref(database, `games/${code}`);
        onValue(gameRef, (snapshot) => {
            if (snapshot.exists()) {
                setGameState(snapshot.val() as GameState);
            } else {
                navigate('/');
            }
        });
        return () => off(gameRef);
    }, [code, navigate]);

    // Setup raise amount default whenever it becomes our turn
    useEffect(() => {
        if (gameState && playerId && gameState.currentTurnId === playerId) {
            const p = gameState.players[playerId];
            if (p) {
                const minRaise = gameState.highestBet > 0 ? gameState.highestBet * 2 : gameState.settings.bigBlind;
                setRaiseAmount(minRaise);
            }
        }
    }, [gameState?.currentTurnId, playerId, gameState?.highestBet, gameState?.settings.bigBlind]);

    // Fetch AI recommendation when it becomes our turn
    useEffect(() => {
        if (gameState && playerId && gameState.currentTurnId === playerId) {
            const fetchRecommendation = async () => {
                setIsThinking(true);
                setRecommendation('');
                try {
                    const res = await fetch('/api/recommend', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ state: gameState, playerId })
                    });
                    const data = await res.json();
                    if (data.recommendation) setRecommendation(data.recommendation);
                } catch (e) {
                    console.error('Failed to get AI recommendation', e);
                } finally {
                    setIsThinking(false);
                }
            };

            // Only fetch if we haven't already for this action
            if (!recommendation && !isThinking) {
                fetchRecommendation();
            }
        }
    }, [gameState?.currentTurnId, playerId, gameState, recommendation, isThinking]);

    // Audio Hook
    useEffect(() => {
        if (gameState) {
            if (gameState.currentTurnId === playerId && previousTurnRef.current !== playerId) {
                playSound('turn');
            }
            if (gameState.street !== previousStreetRef.current && gameState.street !== 'preflop') {
                playSound('card');
            }
            if (gameState.street === 'showdown' && previousStreetRef.current !== 'showdown') {
                playSound('win');
            }
            previousTurnRef.current = gameState.currentTurnId;
            previousStreetRef.current = gameState.street;
        }
    }, [gameState, playerId, playSound]);

    // Host Auto-Progression Hook
    useEffect(() => {
        if (gameState && isHost && gameState.street === 'showdown' && gameState.currentTurnId === null && code) {
            const timer = setTimeout(() => {
                startNextRound(code);
            }, 7000); // 7 second showdown pause
            return () => clearTimeout(timer);
        }
    }, [gameState?.street, gameState?.currentTurnId, isHost, code]);

    // Host Ping Update
    useEffect(() => {
        if (!isHost || !code) return;
        const interval = setInterval(() => {
            const dbRef = ref(database, `games/${code}`);
            import('firebase/database').then(({ update }) => {
                update(dbRef, { lastHostPing: Date.now() }).catch(console.error);
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [isHost, code]);

    // AFK Player Auto-Fold (Host Only)
    useEffect(() => {
        if (!isHost || !gameState || !code) return;
        if (gameState.currentTurnId && gameState.lastTurnStartAt && gameState.street !== 'showdown') {
            const interval = setInterval(() => {
                // 45 seconds to act
                if (Date.now() - gameState.lastTurnStartAt! > 45000) {
                    submitPlayerAction(code, gameState.currentTurnId!, 'fold').catch(console.error);
                }
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isHost, gameState?.currentTurnId, gameState?.lastTurnStartAt, gameState?.street, code]);

    // Host Migration (Non-hosts check if host is dead)
    useEffect(() => {
        if (isHost || !gameState || !code || !playerId) return;
        const interval = setInterval(() => {
            const now = Date.now();
            if (gameState.lastHostPing && (now - gameState.lastHostPing > 15000)) {
                const activeIds = gameState.playerOrder.filter(id => {
                    const st = gameState.players[id]?.status;
                    return st !== 'eliminated' && st !== 'waiting';
                }).sort();

                if (activeIds.length > 0 && activeIds[0] === playerId) {
                    usePlayerStore.getState().actions.joinGameFlow(code, true);
                    import('firebase/database').then(({ update }) => {
                        update(ref(database, `games/${code}`), {
                            hostId: playerId,
                            lastHostPing: Date.now()
                        }).catch(console.error);
                    });
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [isHost, gameState?.lastHostPing, gameState?.playerOrder, code, playerId]);

    if (!gameState) {
        return (
            <div className="flex flex-col min-h-[100dvh] bg-slate-900 items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-700 border-t-rose-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Determine player seating relative to local player
    // For mobile, index 0 is bottom center. The rest are distributed around an ellipse.
    // Let's just create an array of players starting from local player.
    const allPlayersIds = gameState.playerOrder || [];
    let localIndex = allPlayersIds.indexOf(playerId || '');
    if (localIndex === -1) localIndex = 0; // fallback if observer?

    const seatedPlayers: string[] = [];
    for (let i = 0; i < allPlayersIds.length; i++) {
        seatedPlayers.push(allPlayersIds[(localIndex + i) % allPlayersIds.length]);
    }

    // Helper to get fixed positions for up to 9 players, assuming local player is bottom
    // We map index in seatedPlayers (0 to N-1) to an explicit CSS top/left percentage.
    const getSeatingPosition = (index: number, total: number) => {
        if (index === 0) return { bottom: '-30px', left: '50%', transform: 'translateX(-50%)' }; // Bottom center

        // Distribute remaining (total - 1) players along the top/left/right border of the table
        const remaining = total - 1;
        const fraction = index / (remaining + 1); // 0 to 1

        // roughly map fraction to angle: from left (180 deg) over top to right (0 deg)
        // Angle in radians: Pi to 0
        const angle = Math.PI - (Math.PI * fraction);

        // Ellipse dimensions
        const xRadius = 130; // approx px from center
        const yRadius = 160;

        // Center is 50%, 50%
        const x = Math.cos(angle) * xRadius;
        const y = -(Math.sin(angle) * yRadius);

        return {
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            transform: 'translate(-50%, -50%)'
        };
    };

    return (
        <div className="flex flex-col min-h-[100dvh] bg-slate-900 overflow-hidden relative font-sans">
            {/* Top HUD */}
            <header className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-slate-950/80 to-transparent">
                <div>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Round {gameState.round || 1}</span>
                    <span className="text-white font-mono">{gameState.settings.smallBlind} / {gameState.settings.bigBlind}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-1">
                        <button onClick={toggleSound} className="p-1.5 bg-slate-800 rounded-full border border-slate-700">
                            {soundEnabled ? <Volume2 size={14} className="text-slate-300" /> : <VolumeX size={14} className="text-slate-500" />}
                        </button>
                        <Link to="/" className="text-xs text-rose-400 font-bold px-3 py-1 bg-rose-950/50 rounded-full border border-rose-900 inline-block">Leave Game</Link>
                    </div>
                    <div className="text-slate-500 text-xs font-mono block">Code: {code}</div>
                </div>
            </header>

            {/* Center Table Area */}
            <main className="flex-1 flex flex-col items-center justify-center relative p-4 pt-16 pb-32">
                <div className="relative w-64 h-[380px] sm:w-80 sm:h-[420px] bg-emerald-900/40 rounded-[120px] border-8 border-slate-800 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)] flex items-center justify-center">

                    {/* Pot Area & Board Cards */}
                    <div className="flex flex-col items-center justify-center absolute z-20 gap-4">
                        {/* Pot details */}
                        <div className="text-center">
                            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider block mb-1">Total Pot</span>
                            <div className="text-2xl font-mono font-black text-white px-4 py-1.5 bg-slate-900/80 rounded-full border border-slate-700 shadow-xl">
                                {gameState.pot + gameState.sidePots.reduce((acc, p) => acc + p.amount, 0)}
                            </div>
                        </div>

                        {/* Board Cards */}
                        {gameState.boardCards && gameState.boardCards.length > 0 && (
                            <div className="flex gap-1">
                                <AnimatePresence>
                                    {gameState.boardCards.map((card, idx) => {
                                        const suit = card[1];
                                        const value = card[0];
                                        const isRed = suit === 'h' || suit === 'd';
                                        const suitSymbol = suit === 's' ? '♠' : suit === 'h' ? '♥' : suit === 'd' ? '♦' : '♣';

                                        return (
                                            <motion.div
                                                key={card}
                                                initial={{ opacity: 0, x: 20, scale: 0.8, rotateY: 180 }}
                                                animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
                                                transition={{ duration: 0.4, ease: 'easeOut', delay: idx * 0.1 }}
                                                className={`w-8 h-11 sm:w-10 sm:h-14 bg-white rounded flex items-center justify-center border border-slate-300 shadow-md ${isRed ? 'text-red-500' : 'text-slate-800'}`}
                                            >
                                                <span className="font-bold text-sm sm:text-base">{value}{suitSymbol}</span>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Players HUD */}
                    {seatedPlayers.map((pid, idx) => {
                        const p = gameState.players[pid];
                        if (!p) return null;

                        const isCurrentTurn = gameState.currentTurnId === pid;
                        const posStyle = getSeatingPosition(idx, seatedPlayers.length);

                        return (
                            <div
                                key={pid}
                                className={`absolute z-30 flex flex-col items-center ${isCurrentTurn ? 'scale-110 z-40' : ''} transition-all duration-300`}
                                style={posStyle}
                            >
                                {/* Player Bet Amount (Shown towards center of table) */}
                                {p.currentBet !== undefined && p.currentBet > 0 && (
                                    <div className={`absolute ${idx === 0 ? '-top-8' : idx > seatedPlayers.length / 2 ? '-left-12' : '-right-12'} bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-600 shadow-md text-emerald-400 font-mono text-xs z-50`}>
                                        {p.currentBet}
                                    </div>
                                )}

                                {/* Dealer / SB / BB Chips */}
                                {p.position !== 'none' && p.position !== 'utg' && (
                                    <div className={`absolute ${idx === 0 ? '-right-6 -top-2' : '-bottom-4 -left-2'} w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[8px] font-black shadow-md z-50 ${p.position === 'dealer' ? 'bg-white text-slate-800' : p.position === 'sb' ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-slate-900'}`}>
                                        {p.position === 'dealer' ? 'D' : p.position === 'sb' ? 'SB' : 'BB'}
                                    </div>
                                )}

                                {/* Main Player Box */}
                                <motion.div
                                    animate={{ scale: isCurrentTurn ? 1.05 : 1 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                    className={`relative bg-slate-800 p-2 border-2 rounded-xl text-center w-24 sm:w-28 shadow-xl ${isCurrentTurn ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] z-40' : p.status === 'folded' ? 'border-slate-700 opacity-50' : 'border-slate-700'}`}
                                >
                                    <div className="text-white text-xs font-bold truncate mb-0.5">{p.id === playerId ? 'You' : p.name}</div>
                                    <div className="text-emerald-400 font-mono text-xs sm:text-sm mb-1">{p.balance}</div>

                                    {/* Action Status or Cards */}
                                    <div className="h-6 flex items-center justify-center">
                                        {p.status === 'folded' ? (
                                            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Folded</span>
                                        ) : p.status === 'all-in' ? (
                                            <span className="text-rose-500 text-[10px] uppercase font-bold tracking-widest">All-in</span>
                                        ) : p.cards ? (
                                            <div className="flex gap-1 justify-center">
                                                {/* Show real cards if local player or showdown, else show card backs */}
                                                {(p.id === playerId || gameState.street === 'showdown') ? (
                                                    p.cards.map((card, cIdx) => {
                                                        const suit = card[1];
                                                        const isRed = suit === 'h' || suit === 'd';
                                                        return (
                                                            <motion.div
                                                                key={`${p.id}-${card}`}
                                                                initial={{ scale: 0, rotateY: 90 }}
                                                                animate={{ scale: 1, rotateY: 0 }}
                                                                transition={{ delay: cIdx * 0.15 }}
                                                                className={`w-4 h-6 bg-white rounded-[3px] border border-slate-300 shadow flex items-center justify-center text-[10px] font-bold ${isRed ? 'text-red-500' : 'text-slate-800'}`}
                                                            >
                                                                {card[0]}
                                                            </motion.div>
                                                        );
                                                    })
                                                ) : (
                                                    <>
                                                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-4 h-6 bg-slate-200 rounded-[3px] border border-slate-400 shadow overflow-hidden relative">
                                                            <div className="w-full h-full bg-blue-600/20" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(37, 99, 235, 0.2) 2px, rgba(37, 99, 235, 0.2) 4px)' }}></div>
                                                        </motion.div>
                                                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="w-4 h-6 bg-slate-200 rounded-[3px] border border-slate-400 shadow overflow-hidden relative">
                                                            <div className="w-full h-full bg-blue-600/20" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(37, 99, 235, 0.2) 2px, rgba(37, 99, 235, 0.2) 4px)' }}></div>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Wait</span>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })}

                </div>
            </main>

            <div className="absolute bottom-0 inset-x-0 bg-slate-950 border-t border-slate-800 p-4 pb-safe flex flex-col gap-2 z-40">
                {gameState.currentTurnId === playerId ? (
                    (() => {
                        const me = gameState.players[playerId!];
                        const outstanding = gameState.highestBet - (me.currentBet || 0);
                        const canCheck = outstanding === 0;
                        const callAmount = Math.min(me.balance, outstanding);

                        const handleAction = async (action: 'fold' | 'check' | 'call' | 'raise', amt = 0) => {
                            if (isSubmitting || !code || !playerId) return;

                            if (action === 'fold') playSound('fold');
                            else playSound('chip');

                            setIsSubmitting(true);
                            try {
                                await submitPlayerAction(code, playerId, action, amt);
                            } catch (e: any) {
                                alert(e.message);
                            } finally {
                                setIsSubmitting(false);
                            }
                        };

                        return (
                            <>
                                {/* Suggestion HUD */}
                                <div className="bg-slate-900 rounded-lg p-2 text-center border border-slate-800 mb-2">
                                    <span className="text-amber-400 text-xs font-bold">🎯 AI Suggests //</span>
                                    <span className="text-slate-300 text-xs ml-2 tracking-wide font-medium">
                                        {isThinking ? (
                                            <span className="animate-pulse flex items-center justify-center gap-2 inline-flex"><div className="w-3 h-3 border-2 border-slate-500 border-t-amber-400 rounded-full animate-spin"></div> Analyzing odds...</span>
                                        ) : recommendation ? (
                                            `"${recommendation}"`
                                        ) : 'Action is on you.'}
                                    </span>
                                </div>

                                {/* Slider and Quick Buttons for Raise */}
                                {me.balance > outstanding && (
                                    <div className="flex flex-col gap-2 mb-2">
                                        <div className="flex gap-2 px-2">
                                            <button
                                                onClick={() => setRaiseAmount(Math.min(me.balance + (me.currentBet || 0), gameState.settings.bigBlind * 2))}
                                                className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold py-1.5 rounded-md transition-colors"
                                            >2BB</button>
                                            <button
                                                onClick={() => setRaiseAmount(Math.min(me.balance + (me.currentBet || 0), gameState.settings.bigBlind * 3))}
                                                className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold py-1.5 rounded-md transition-colors"
                                            >3BB</button>
                                            <button
                                                onClick={() => setRaiseAmount(Math.min(me.balance + (me.currentBet || 0), gameState.pot + (gameState.sidePots.reduce((a, b) => a + b.amount, 0))))}
                                                className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold py-1.5 rounded-md transition-colors"
                                            >Pot</button>
                                            <button
                                                onClick={() => setRaiseAmount(me.balance + (me.currentBet || 0))}
                                                className="flex-1 bg-slate-800 hover:bg-slate-700 border border-rose-900 text-rose-400 text-[10px] font-bold py-1.5 rounded-md transition-colors"
                                            >All-in</button>
                                        </div>
                                        <div className="flex items-center gap-3 px-2">
                                            <span className="text-slate-400 text-xs font-bold">Raise:</span>
                                            <input
                                                type="range"
                                                min={gameState.highestBet > 0 ? gameState.highestBet * 2 : gameState.settings.bigBlind}
                                                max={me.balance + (me.currentBet || 0)}
                                                step={gameState.settings.smallBlind}
                                                value={raiseAmount}
                                                onChange={(e) => setRaiseAmount(Number(e.target.value))}
                                                className="flex-1 accent-rose-500"
                                            />
                                            <span className="text-emerald-400 font-mono text-sm font-bold w-12 text-right">{raiseAmount}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-4 gap-2">
                                    <button
                                        onClick={() => handleAction('fold')}
                                        disabled={isSubmitting}
                                        className="bg-slate-800 text-slate-300 rounded-xl py-3 font-bold text-sm disabled:opacity-50"
                                    >
                                        Fold
                                    </button>

                                    {canCheck ? (
                                        <button
                                            onClick={() => handleAction('check')}
                                            disabled={isSubmitting}
                                            className="bg-slate-700 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50"
                                        >
                                            Check
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAction('call')}
                                            disabled={isSubmitting}
                                            className="bg-slate-700 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50"
                                        >
                                            Call {callAmount}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleAction('raise', raiseAmount - (me.currentBet || 0))}
                                        disabled={isSubmitting || me.balance <= outstanding}
                                        className="col-span-2 bg-rose-600 text-white rounded-xl py-3 font-bold text-sm tracking-wide disabled:opacity-50"
                                    >
                                        Raise to {raiseAmount}
                                    </button>
                                </div>
                            </>
                        );
                    })()
                ) : (
                    <div className="text-center text-slate-400 text-sm py-4 font-medium animate-pulse">
                        {gameState.currentTurnId ? `Waiting for ${gameState.players[gameState.currentTurnId]?.name}...` : 'Waiting for next round...'}
                    </div>
                )}
            </div >
        </div>
    );
}
