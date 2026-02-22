import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { joinGameRoom } from '../lib/gameService';
import { usePlayerStore } from '../store/playerStore';
import { Loader2 } from 'lucide-react';

export default function JoinGame() {
    const navigate = useNavigate();
    const { setPlayerSession, joinGameFlow } = usePlayerStore((state) => state.actions);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        inviteCode: '',
        playerName: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'inviteCode' ? value.toUpperCase() : value
        }));
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.playerName.trim() || !formData.inviteCode.trim()) {
            setError('Both Invite Code and Player Name are required.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // 1. Generate stable ID if not auth'd
            const playerId = crypto.randomUUID();
            const code = formData.inviteCode.trim();

            // 2. Join Firebase Room
            await joinGameRoom(code, playerId, formData.playerName);

            // 3. Update Local Session
            setPlayerSession(playerId, formData.playerName);
            joinGameFlow(code, false);

            // 4. Navigate to Lobby
            navigate(`/lobby/${code}`);

        } catch (err: any) {
            console.error("Game Join Error:", err);
            setError(err.message || 'Failed to join game. Please check the code.');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-[100dvh] p-6 bg-slate-950">
            <header className="mb-6 flex items-center">
                <Link to="/" className="text-slate-400 hover:text-white mr-4 p-2 -ml-2">
                    ← Back
                </Link>
                <h1 className="text-2xl font-bold text-white">Join Game</h1>
            </header>

            <main className="flex-1 flex flex-col max-w-md w-full mx-auto">
                <form onSubmit={handleJoin} className="space-y-5 flex-1 flex flex-col">

                    {error && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-lg text-sm">{error}</div>}

                    <div className="space-y-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                        <div>
                            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Invite Code</label>
                            <input
                                type="text"
                                name="inviteCode"
                                value={formData.inviteCode}
                                onChange={handleChange}
                                placeholder="e.g. A1B2C3"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-mono tracking-widest uppercase"
                                maxLength={6}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Your Name</label>
                            <input
                                type="text"
                                name="playerName"
                                value={formData.playerName}
                                onChange={handleChange}
                                placeholder="e.g. Maverick"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-all font-medium"
                                maxLength={15}
                                required
                            />
                        </div>
                    </div>

                    <div className="mt-auto pt-6">
                        <button
                            type="submit"
                            disabled={isLoading || formData.inviteCode.length < 6}
                            className="w-full text-center flex items-center justify-center py-4 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors shadow-lg border border-slate-700 text-white font-bold disabled:opacity-50"
                        >
                            {isLoading ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Joining...</>
                            ) : (
                                'Join Lobby'
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
