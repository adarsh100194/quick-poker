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
        playerOrder: [],
        pot: 0,
        sidePots: [],
        currentTurnId: null,
        dealerId: null,
        round: 0,
        street: 'preflop',
        boardCards: [],
        highestBet: 0,
        totalChipsInPlay: settings.initialStack
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

    await update(ref(database, `games/${code}/players`), {
        [playerId]: newPlayer
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
