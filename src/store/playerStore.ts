import { create } from 'zustand';

interface PlayerState {
    playerId: string | null;
    playerName: string | null;
    isHost: boolean;
    currentGameCode: string | null;
    actions: {
        setPlayerSession: (id: string, name: string) => void;
        joinGameFlow: (code: string, isHost?: boolean) => void;
        leaveGame: () => void;
    };
}

export const usePlayerStore = create<PlayerState>((set) => ({
    playerId: null,
    playerName: null,
    isHost: false,
    currentGameCode: null,
    actions: {
        setPlayerSession: (id, name) => set({ playerId: id, playerName: name }),
        joinGameFlow: (code, isHost = false) => set({ currentGameCode: code, isHost }),
        leaveGame: () => set({ currentGameCode: null, isHost: false }),
    }
}));

// Selectors for easier usage
export const usePlayerId = () => usePlayerStore((state) => state.playerId);
export const usePlayerName = () => usePlayerStore((state) => state.playerName);
export const useIsHost = () => usePlayerStore((state) => state.isHost);
export const useCurrentGameCode = () => usePlayerStore((state) => state.currentGameCode);
export const usePlayerActions = () => usePlayerStore((state) => state.actions);
