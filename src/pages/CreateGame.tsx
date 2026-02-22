import { Link } from 'react-router-dom';

export default function CreateGame() {
    return (
        <div className="flex flex-col min-h-[100dvh] p-6">
            <header className="mb-8 flex items-center">
                <Link to="/" className="text-slate-400 hover:text-white mr-4">
                    ← Back
                </Link>
                <h1 className="text-2xl font-bold">Create Game</h1>
            </header>

            <main className="flex-1 flex flex-col gap-6">
                <p className="text-slate-400">Settings form will go here.</p>

                {/* Placeholder button */}
                <Link
                    to="/lobby/test-code"
                    className="w-full text-center py-4 rounded-xl bg-rose-600 font-bold shadow-lg"
                >
                    Create & Go to Lobby
                </Link>
            </main>
        </div>
    );
}
