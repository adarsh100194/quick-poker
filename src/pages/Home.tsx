import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { Play, Users } from 'lucide-react';

export default function Home() {
    return (
        <div className="flex flex-col min-h-[100dvh]">
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-10">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-white">
                        QuickPoker <span className="text-rose-500">Live</span>
                    </h1>
                    <p className="text-slate-400">The fastest way to host a private poker game online.</p>
                </div>

                <div className="w-full max-w-sm space-y-4">
                    <Link
                        to="/create"
                        className="w-full flex items-center justify-center py-4 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/40 text-white font-bold text-lg"
                    >
                        <Play className="w-5 h-5 mr-2" />
                        Create Game
                    </Link>

                    <Link
                        to="/join"
                        className="w-full flex items-center justify-center py-4 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors shadow-lg border border-slate-700 text-white font-bold text-lg"
                    >
                        <Users className="w-5 h-5 mr-2" />
                        Join Game
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
}
