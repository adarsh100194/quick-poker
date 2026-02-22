# PRODUCT REQUIREMENTS DOCUMENT
## Product Name (Working): QuickPoker Live

### 1️⃣ PRODUCT VISION
A lightweight mobile-first web poker app that lets anyone:
- Start a private Texas Hold’em game instantly
- Share an invite code
- Track chips and pot in real time
- Get one-line strategic recommendations at every action
- See all balances clearly at all times
- Play without backend complexity or financial risk

**Positioning:**
“The fastest way to host a private poker game online.”

### 2️⃣ TARGET USERS
**Primary**
- Friends playing home games
- Office teams
- College groups
- Small private tournaments

**Secondary**
- Poker learners who want guided play
- Content creators running games live

### 3️⃣ CORE FEATURES
**A. CREATE NEW GAME FLOW (Home Screen)**
- **Screen 1: Start Game**
  - Inputs:
    - Game Name (optional)
    - Number of Players (2–9)
    - Initial Coins per Player (e.g., 10,000)
    - Small Blind amount
    - Big Blind amount
    - Optional: Blind increase interval
  - Tap: Create Game
  - System Generates:
    - Unique Invite Code (6-character alphanumeric)
    - Share button (WhatsApp / Copy link)
    - Game Lobby page
  - **Footer Branding (Must be visible on this Home screen):**
    - Text: `© 2026 Quick Poker. All Rights Reserved.`
    - Text: `app designed, developed & managed by CompleteDigi` (with link to `https://completedigi.com`)

**B. JOIN GAME FLOW**
- **Screen:**
  - Enter Invite Code
  - Enter Player Name
  - Tap: Join
  - If room exists: → Enter Lobby

### 4️⃣ GAME ARCHITECTURE (NO BACKEND COMPLEXITY)
- Use WebRTC or peer-to-peer state sync
- Or use Firebase realtime DB (lightweight)
- No chip calculations server-side
- Deterministic pot calculation logic on client
- **Important:**
  - All calculations happen via single authoritative game host
  - Others are synced view-only clients
  - Prevents ledger mismatch
  - Host device = calculation engine.

### 5️⃣ GAME TABLE UI
Mobile-first layout:

**🟢 Top Section**
- Round Number (e.g., Round 7)
- Blinds (100 / 200)
- Current Dealer indicator (D)
- Pot Amount (center highlighted)
- Side pot (if exists)

**🟡 Middle Section (Table View)**
- Circular layout: Each player card shows:
  - Name
  - Balance
  - Position (SB/BB/D)
  - Current action indicator
  - Last action (Call / Raise / Fold)
  - All-in tag

**🔵 Bottom Section (Active Player Controls)**
- Fold
- Call
- Raise (slider + quick buttons: 2x, 3x, Pot, All-in)
- Check (when applicable)

### 6️⃣ ALWAYS VISIBLE INFORMATION
At ALL times:
- Total pot
- Each player’s current balance
- Total chips in play (for debug mode)
- Round number
- Street (Preflop / Flop / Turn / River)
- No hidden state.

### 7️⃣ GAME LOGIC REQUIREMENTS
**Round Flow**
- Dealer rotates automatically
- Blinds auto-post
- Cards dealt (private to each player)
- Action rotates clockwise
- Pot updates in real-time
- After showdown:
  - Pot distributed
  - Eliminated players marked
  - Round number increments

**STRICT LEDGER RULE**
- System must enforce:
  - Sum(all player balances) + Pot = Total Chips
  - Every state transition validates this.
- If mismatch:
  - Block action
  - Show error

### 8️⃣ RECOMMENDATION ENGINE
At every decision point:
- Show one-line recommendation under buttons:
- Examples:
  - “Premium hand — raise for value.”
  - “Marginal spot — consider folding.”
  - “Strong draw — semi-bluff viable.”
  - “Paired board — caution advised.”
- Rules engine:
  - Based on position
  - Stack depth
  - Pot odds
  - Hand strength tier
  - Number of players
- No solver complexity.
- Heuristic-based engine.
- Can be toggle ON/OFF.

### 9️⃣ SOUND EFFECTS
**Core Sounds:**
- Card dealing sound
- Chip bet sound
- Raise sound (heavier chip stack)
- All-in dramatic sound
- Fold (card flick)
- Winner celebration sound
- Round start chime

**Optional:**
- Subtle background casino ambience
- Haptic feedback on action
- Sound toggle in settings.

### 🔟 GRAPHIC EFFECTS
Visual polish:
- Chip stack animation when betting
- Pot grows with chip animation
- Glow effect for current player
- Dealer button animation
- All-in red glow
- Confetti on tournament win
- Slow-motion showdown reveal
- Performance optimized for mobile.

### 1️⃣1️⃣ ANTI-CONFUSION DESIGN
To avoid ledger issues:
- Every action updates:
  - Player balance
  - Pot
  - “Total chips in system” debug number
  - All-in auto-calculation
  - Side pots auto-created
- Clear highlight of:
  - Required call amount
  - Current highest bet
  - Player stack

### 1️⃣2️⃣ HEADS-UP MODE ENHANCEMENTS
When 2 players left:
- Dealer posts SB
- Faster animation
- Recommendation engine adjusts ranges wider

### 1️⃣3️⃣ EDGE CASE HANDLING
- Disconnection handling
- Rejoin with same name
- Host migration if host leaves
- All-in with uneven stacks
- Side pot management
- Timeout auto-check/fold (optional)

### 1️⃣4️⃣ GAME SETTINGS PANEL
- Sound ON/OFF
- Animation speed
- Recommendation ON/OFF
- Dark mode
- Show hand history
- Show chip conservation debug

### 1️⃣5️⃣ OPTIONAL ADDITIONS (HIGH VALUE)
- Emoji reactions
- Table chat
- Hand history replay
- Stats panel:
  - VPIP
  - Aggression
  - Win rate
- Tournament mode:
  - Automatic blind increases
  - Quick rematch button

### 1️⃣6️⃣ TECH STACK
- Frontend: React + Tailwind (mobile optimized)
- PWA enabled
- State: Zustand / Redux
- Realtime: WebRTC peer sync OR Firebase Realtime
- Sound: Web Audio API
- Animation: Framer Motion
- Deployment: Vercel / Netlify
- No payment integration.

### 1️⃣7️⃣ MVP SCOPE (PHASE 1)
**Must Have:**
- Create / Join via invite code
- Balance tracking
- Pot tracking
- Round number
- Basic animations
- One-line recommendation engine
- Sound effects
- Heads-up support
- Side pot logic

### 1️⃣8️⃣ SUCCESS METRICS
- Game creation completion rate
- Avg session length
- Rematch rate
- % recommendation feature used
- Zero ledger bug reports

### 1️⃣9️⃣ FUTURE ROADMAP
**Phase 2:**
- AI bot players
- Public tables
- Tournament bracket mode

**Phase 3:**
- Crypto play money
- Real-money compliant version
- Poker training mode

### 2️⃣0️⃣ PRODUCT DIFFERENTIATION
Compared to other poker apps:
- No download ✅
- Invite code instant play ✅
- Live recommendation ✅
- Clear ledger visibility ✅
- Lightweight ✅
- No forced login ✅

🔥 **Final Product Summary**
A frictionless:
- Social
- Guided
- Transparent
- Zero-confusion
- Mobile-first poker experience
