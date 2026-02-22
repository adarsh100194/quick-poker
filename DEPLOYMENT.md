# Deployment & Local Setup Guide

QuickPoker is designed to be easily deployed to modern serverless hosting environments like **Vercel** or **Netlify**, with a **Firebase** backend. 

### Prerequisites
*   Node.js > 18.0
*   A Firebase project with Realtime Database enabled
*   An OpenAI API key (if you want the AI recommendations feature)

---

## 💻 Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adarsh100194/quick-poker.git
   cd quick-poker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example config file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your keys.

4. **Run the local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🚀 Production Deployment (Vercel)

We recommend **Vercel** because the OpenAI Recommendation engine relies on Vercel Serverless Functions (`/api/recommend.ts`).

1. Ensure your codebase is pushed to your GitHub repository.
2. Log into [Vercel](https://vercel.com/) and click **Add New > Project**.
3. Import your `quick-poker` Git repository.
4. In the configuration settings, **Environment Variables**, add everything from your `.env` file:
   * `VITE_FIREBASE_API_KEY`
   * `VITE_FIREBASE_AUTH_DOMAIN`
   * `VITE_FIREBASE_PROJECT_ID`
   * `VITE_FIREBASE_STORAGE_BUCKET`
   * `VITE_FIREBASE_MESSAGING_SENDER_ID`
   * `VITE_FIREBASE_APP_ID`
   * `VITE_FIREBASE_DATABASE_URL`
   * `OPENAI_API_KEY` (Used specifically by the Serverless Function)
5. Click **Deploy**.

Because it is a Vite React project, Vercel will auto-detect the build settings (`npm run build`). The `index.html` file includes the PWA Manifest config, meaning users opening your production URL on their phone will be prompted to "Add to Home Screen" as a native-feeling app.

## 🗄️ Firebase Setup Guide

If you are setting up your own Firebase Backend:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a Project and register a Web App.
3. Enable **Realtime Database** (Start in Test Mode).
4. Recommended Realtime Database Rules: 
   *(Note: This allows open read/write. For production, apply anonymous auth rules)*
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
5. Retrieve your configuration object and place the values in your `.env` format.
