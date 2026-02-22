import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createGameRoom } from '../lib/gameService';
import type { GameSettings } from '../lib/gameService';
import { usePlayerStore } from '../store/playerStore';
import { Loader2 } from 'lucide-react';


export default function CreateGame() {
    const navigate = useNavigate();
    const { setPlayerSession, joinGameFlow } = usePlayerStore((state) => state.actions);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        hostName: '',
        gameName: 'Midnight Poker',
        maxPlayers: 9,
        initialStack: 10000,
        smallBlind: 50,
        bigBlind: 100
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'hostName' || name === 'gameName' ? value : Number(value)
        }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.hostName.trim()) {
            setError('Player name is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // 1. Generate a stable device/player ID if we don't have auth
            const playerId = crypto.randomUUID();

            // 2. Prepare Settings
            const settings: GameSettings = {
                name: formData.gameName,
                maxPlayers: formData.maxPlayers,
                initialStack: formData.initialStack,
                smallBlind: formData.smallBlind,
                bigBlind: formData.bigBlind
            };

            // 3. Create Firebase Room
            const code = await createGameRoom(playerId, formData.hostName, settings);

            // 4. Update Local Session State
            setPlayerSession(playerId, formData.hostName);
            joinGameFlow(code, true);

            // 5. Navigate to Lobby
            navigate(`/lobby/${code}`);

        } catch (err) {
            console.error("Game Creation Error:", err);
            setError('Failed to create game. Please check your connection.');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-[100dvh] p-6 bg-slate-950">
            <header className="mb-6 flex items-center">
                <Link to="/" className="text-slate-400 hover:text-white mr-4 p-2 -ml-2">
                    ← Back
                </Link>
                <h1 className="text-2xl font-bold text-white">Create Game</h1>
            </header>

            <main className="flex-1 flex flex-col max-w-md w-full mx-auto">
                <form onSubmit={handleCreate} className="space-y-5 flex-1 flex flex-col">

                    {error && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-lg text-sm">{error}</div>}

                    <div className="space-y-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                        <div>
                            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Your Name</label>
                            <input
                                type="text"
                                name="hostName"
                                value={formData.hostName}
                                onChange={handleChange}
                                placeholder="e.g. Maverick"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-medium"
                                maxLength={15}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Game Name (Optional)</label>
                            <input
                                type="text"
                                name="gameName"
                                value={formData.gameName}
                                onChange={handleChange}
                                placeholder="Late Night Hold'em"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-all"
                                maxLength={20}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Players</label>
                                <select
                                    name="maxPlayers"
                                    value={formData.maxPlayers}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none appearance-none"
                                >
                                    {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                        <option key={num} value={num}>{num} Max</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Starting Chips</label>
                                <input
                                    type="number"
                                    name="initialStack"
                                    value={formData.initialStack}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-mono"
                                    min={500}
                                    step={500}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Small Blind</label>
                                <input
                                    type="number"
                                    name="smallBlind"
                                    value={formData.smallBlind}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-mono"
                                    min={1}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Big Blind</label>
                                <input
                                    type="number"
                                    name="bigBlind"
                                    value={formData.bigBlind}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-mono"
                                    min={2}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-6">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full text-center flex items-center justify-center py-4 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold shadow-lg shadow-rose-900/40 text-white transition-colors disabled:opacity-70"
                        >
                            {isLoading ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating Game...</>
                            ) : (
                                'Create Game'
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
