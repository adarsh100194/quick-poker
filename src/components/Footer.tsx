export default function Footer() {
    return (
        <footer className="w-full py-4 px-6 mt-auto border-t border-slate-800 bg-slate-950/50 backdrop-blur text-center text-xs text-slate-400">
            <p className="mb-1">© 2026 Quick Poker. All Rights Reserved.</p>
            <div className="flex justify-center items-center gap-1 flex-wrap">
                <span>app designed, developed & managed by</span>
                <a
                    href="https://completedigi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
                >
                    CompleteDigi
                </a>
            </div>
        </footer>
    );
}
