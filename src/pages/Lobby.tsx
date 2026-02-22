import { Link, useParams } from 'react-router-dom';

export default function Lobby() {
    const { code } = useParams();

    return (
        <div className="flex flex-col min-h-[100dvh] p-6 bg-slate-900">
            <header className="mb-8 text-center pt-4">
                <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Invite Code</h2>
                <div className="text-4xl font-mono font-bold tracking-widest text-emerald-400 bg-slate-950/50 py-3 rounded-xl border border-emerald-900/50">
                    {code || 'A1B2C3'}
                </div>
            </header>

            <main className="flex-1 flex flex-col">
                <div className="bg-slate-800/50 rounded-2xl p-4 flex-1 border border-slate-700/50 mb-6">
                    <h3 className="text-lg font-bold mb-4">Players (1/9)</h3>
                    <ul className="space-y-3">
                        <li className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <span className="font-medium text-white">Local Player</span>
                            <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-1 rounded-md font-bold">Host</span>
                        </li>
                    </ul>
                </div>

                <Link
                    to={`/table/${code}`}
                    className="w-full text-center py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/40 text-white font-bold text-lg"
                >
                    Start Game
                </Link>
            </main>
        </div>
    );
}
