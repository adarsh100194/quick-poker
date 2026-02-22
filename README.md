# 🃏 QuickPoker

QuickPoker is a real-time, lightweight Texas Hold'em web application designed for mobile-first play. It eliminates the need for complex poker servers by leveraging **Firebase Realtime Database** for state synchronization and relying on the **Host Client** to run the game engine.

**🎮 Play Online:** [completedigi.in/quick-poker](https://completedigi.in/quick-poker)

![QuickPoker Preview](https://github.com/adarsh100194/quick-poker/assets/12345/preview.png) *(Preview Placeholder)*

---

## 📖 Documentation
QuickPoker is fully open-source. Whether you're a player looking to host a fast game with friends, or a developer looking to understand the real-time serverless architecture, we've carefully documented everything you need to know.

1. **[Technical Specification Document (TSD)](TSD.md)** - Learn about the system lifecycle, "Host-driven" state calculation model, the `pokersolver` validations, and how we handle edge cases without a dedicated backend server.
2. **[Deployment & Local Setup Guide](DEPLOYMENT.md)** - Instructions on how to run QuickPoker locally on your own machine, how to configure Firebase, and how to instantly deploy your own instance to Vercel.

---

## ✨ Features
*   **Host-Driven Architecture**: The player who creates the game executes all game rules inside their browser—no Node.js server required!
*   **Strict Ledger State**: A built-in validation watcher that mathematically ensures chips can never be accidentally duplicated or lost due to network lag. 
*   **AI Recommendations**: Unsure what to do? The Host client is hooked up to an OpenAI GPT-4o serverless hook that reads your odds and gives you a 1-sentence recommended action!
*   **Mobile-First PWA**: Add it directly to your iOS or Android home screen for an immersive, full-screen poker experience featuring custom Web Audio API synthesized sound effects.
*   **Smart Edge Cases**: Automatically promotes the next player to Host if the creator goes offline. AFK players automatically fold to keep the game moving. Side-pots are mathematically perfect.

---

## 🛠️ Built With
*   **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion
*   **State / Backend**: Firebase Realtime Database
*   **Serverless**: Vercel Serverless Functions (`api/recommend.ts`)
*   **Libraries**: `Zustand` (Global App State), `lucide-react` (Icons), `pokersolver` (Hand Evaluation)

### 💻 Local Testing Quick-Start
To test locally, read the full [Setup Guide](DEPLOYMENT.md).
```bash
git clone https://github.com/adarsh100194/quick-poker.git
cd quick-poker
npm install
cp .env.example .env
# Fill in your Firebase config in .env
npm run dev
```

---

<p align="center">
  <i>© 2026 Quick Poker. All Rights Reserved. App designed, developed & managed by CompleteDigi.</i>
</p>
