import { useParams, Link } from 'react-router-dom';

export default function GameTable() {
    const { code } = useParams();

    return (
        <div className="flex flex-col min-h-[100dvh] bg-slate-900 overflow-hidden relative">
            {/* Top HUD */}
            <header className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-slate-950/80 to-transparent">
                <div>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Round 1</span>
                    <span className="text-white font-mono">100 / 200</span>
                </div>
                <div className="text-right">
                    <Link to="/" className="text-xs text-rose-400 font-bold px-3 py-1 bg-rose-950/50 rounded-full border border-rose-900 mb-1 inline-block">Leave Game</Link>
                    <div className="text-slate-500 text-xs font-mono block">Code: {code}</div>
                </div>
            </header>

            {/* Center Table Area */}
            <main className="flex-1 flex flex-col items-center justify-center relative P-4 pt-16 pb-32">
                <div className="w-64 h-80 bg-emerald-900/30 rounded-[100px] border-4 border-slate-800 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative">

                    {/* Pot Area */}
                    <div className="text-center absolute z-20">
                        <span className="text-emerald-400 text-sm font-bold uppercase tracking-wider block mb-1">Total Pot</span>
                        <div className="text-3xl font-mono font-black text-white px-4 py-2 bg-slate-900/80 rounded-full border border-slate-700 shadow-xl">
                            1,500
                        </div>
                    </div>

                    {/* Player Cards placeholders */}
                    <div className="absolute -top-6 bg-slate-800 p-2 rounded-xl border border-rose-500 shadow-lg shadow-rose-900/30 w-24 text-center z-30">
                        <div className="text-white text-xs font-bold truncate">Opponent</div>
                        <div className="text-emerald-400 font-mono text-sm">9,800</div>
                        <div className="text-[10px] bg-rose-500/20 text-rose-400 uppercase font-black px-1 mt-1 rounded">Dealer</div>
                    </div>

                    <div className="absolute -bottom-6 bg-slate-800 p-2 rounded-xl border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] w-28 text-center z-30">
                        <div className="text-white text-xs font-bold truncate">You</div>
                        <div className="text-emerald-400 font-mono text-sm mb-1">9,700</div>
                        <div className="flex gap-1 justify-center">
                            <div className="w-4 h-6 bg-white rounded border border-slate-300 shadow"></div>
                            <div className="w-4 h-6 bg-white rounded border border-slate-300 shadow"></div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 inset-x-0 bg-slate-950 border-t border-slate-800 p-4 pb-safe flex flex-col gap-2 z-40">
                <div className="bg-slate-900 rounded-lg p-2 text-center border border-slate-800 mb-2">
                    <span className="text-amber-400 text-xs font-bold">💡 Suggestion:</span>
                    <span className="text-slate-300 text-xs ml-2">Premium hand — raise for value.</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <button className="bg-slate-800 text-slate-300 rounded-xl py-3 font-bold text-sm">Fold</button>
                    <button className="bg-slate-700 text-white rounded-xl py-3 font-bold text-sm">Check</button>
                    <button className="bg-emerald-700 text-white rounded-xl py-3 font-bold text-sm">Call 200</button>
                    <button className="bg-rose-600 text-white rounded-xl py-3 font-bold text-sm tracking-wide">Raise</button>
                </div>
            </div>
        </div>
    );
}
