import { ref, set, get, update, serverTimestamp } from 'firebase/database';
import { database } from './firebase';

// Helper to generate a random 6-character alphanumeric code
export function generateGameCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Initial Game State definition
export interface GameSettings {
    name: string;
    maxPlayers: number;
    initialStack: number;
    smallBlind: number;
    bigBlind: number;
}

export interface Player {
    id: string;
    name: string;
    balance: number;
    status: 'active' | 'waiting' | 'folded' | 'all-in' | 'eliminated';
    position: 'dealer' | 'sb' | 'bb' | 'utg' | 'none'; // simplified
    isHost: boolean;
    avatar: number; // index for a random avatar color or image

    // In-game state
    cards?: [string, string];
    currentBet?: number; // amount bet on the current street
}

export interface SidePot {
    amount: number;
    eligiblePlayerIds: string[];
}

export interface GameState {
    code: string;
    settings: GameSettings;
    status: 'lobby' | 'playing' | 'finished';
    players: Record<string, Player>;
    createdAt: object; // ServerTimestamp
    hostId: string;

    // Playing State
    playerOrder: string[]; // fixed seating order
    pot: number;
    sidePots: SidePot[];
    currentTurnId: string | null;
    dealerId: string | null;
    round: number;
    street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
    boardCards: string[];
    highestBet: number;
    totalChipsInPlay: number; // strict ledger rule tracking
    deck: string[]; // remaining cards in the deck
    lastTurnStartAt?: number; // timestamp for player timeout
    lastHostPing?: number; // timestamp for host migration
}

const SUITS = ['h', 'd', 'c', 's'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export function createDeck(): string[] {
    const deck: string[] = [];
    for (const s of SUITS) {
        for (const r of RANKS) {
            deck.push(r + s);
        }
    }
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

export async function createGameRoom(
    hostId: string,
    hostName: string,
    settings: GameSettings
): Promise<string> {
    const code = generateGameCode();
    const gameRef = ref(database, `games/${code}`);

    // Check if code exists (extremely rare collision but good practice)
    const snapshot = await get(gameRef);
    if (snapshot.exists()) {
        return createGameRoom(hostId, hostName, settings); // retry
    }

    const initialState: GameState = {
        code,
        settings,
        status: 'lobby',
        createdAt: serverTimestamp(),
        hostId,
        players: {
            [hostId]: {
                id: hostId,
                name: hostName,
                balance: settings.initialStack,
                status: 'waiting',
                position: 'none',
                isHost: true,
                avatar: Math.floor(Math.random() * 10)
            }
        },
        playerOrder: [hostId],
        pot: 0,
        sidePots: [],
        currentTurnId: null,
        dealerId: null,
        round: 0,
        street: 'preflop',
        boardCards: [],
        highestBet: 0,
        totalChipsInPlay: settings.initialStack,
        deck: [],
        lastTurnStartAt: Date.now(),
        lastHostPing: Date.now()
    };

    await set(gameRef, initialState);
    return code;
}

export async function joinGameRoom(
    code: string,
    playerId: string,
    playerName: string
): Promise<GameState> {
    const gameRef = ref(database, `games/${code}`);
    const snapshot = await get(gameRef);

    if (!snapshot.exists()) {
        throw new Error('Game not found. Please check your invite code.');
    }

    const gameState = snapshot.val() as GameState;

    if (gameState.status !== 'lobby') {
        throw new Error('Game has already started or finished.');
    }

    const currentPlayersCount = Object.keys(gameState.players || {}).length;
    if (currentPlayersCount >= gameState.settings.maxPlayers) {
        throw new Error('Game is full.');
    }

    // Add the new player
    const newPlayer: Player = {
        id: playerId,
        name: playerName,
        balance: gameState.settings.initialStack,
        status: 'waiting',
        position: 'none',
        isHost: false,
        avatar: Math.floor(Math.random() * 10)
    };

    const playerOrder = gameState.playerOrder || [];
    playerOrder.push(playerId);

    await update(ref(database, `games/${code}`), {
        [`players/${playerId}`]: newPlayer,
        playerOrder,
        totalChipsInPlay: (gameState.totalChipsInPlay || gameState.settings.initialStack) + gameState.settings.initialStack
    });

    return gameState;
}

import { handlePlayerAction, isBettingRoundComplete, progressStreet, evaluateShowdown } from './gameEngine';

export async function submitPlayerAction(
    code: string,
    playerId: string,
    action: 'fold' | 'call' | 'raise' | 'check',
    amount: number = 0
) {
    const gameRef = ref(database, `games/${code}`);
    const snapshot = await get(gameRef);
    if (!snapshot.exists()) throw new Error("Game not found");

    let state = snapshot.val() as GameState;

    // 1. Apply the action
    state = handlePlayerAction(state, playerId, action, amount);

    // 2. Check if the betting round is complete
    if (state.currentTurnId === null || isBettingRoundComplete(state)) {
        // If hand ended because everyone folded OR if everyone called and round is complete
        if (state.currentTurnId === null) {
            // Hand over, evaluate winners
            state = evaluateShowdown(state);
        } else {
            // Progress to next street
            state = progressStreet(state);

            // If it progressed to showdown
            if (state.street === 'showdown') {
                state = evaluateShowdown(state);
            }
        }
    }

    // 3. Write back to Firebase
    await set(gameRef, state);
}

import { initializeRound } from './gameEngine';

export async function startNextRound(code: string) {
    const gameRef = ref(database, `games/${code}`);
    const snapshot = await get(gameRef);
    if (!snapshot.exists()) return;

    let state = snapshot.val() as GameState;
    if (state.status === 'playing' && state.street !== 'showdown' && state.currentTurnId !== null) return;

    state.status = 'playing';
    state = initializeRound(state);
    state.deck = createDeck();

    for (const pid of state.playerOrder) {
        const p = state.players[pid];
        if (p.status === 'active' || p.status === 'all-in') {
            p.cards = [state.deck.pop()!, state.deck.pop()!];
        }
    }

    state.boardCards = [];
    await set(gameRef, state);
}
