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
}

export interface GameState {
    code: string;
    settings: GameSettings;
    status: 'lobby' | 'playing' | 'finished';
    players: Record<string, Player>;
    createdAt: object; // ServerTimestamp
    hostId: string;

    // These will be populated once the game status transitions to 'playing'
    pot?: number;
    currentTurnId?: string;
    round?: number;
    street?: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
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
        }
    };

    await set(gameRef, initialState);
    return code;
}
