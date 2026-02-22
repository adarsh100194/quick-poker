import { describe, it, expect } from 'vitest';
import { validateLedger, withLedgerValidation } from '../gameEngine';
import type { GameState } from '../gameService';

describe('GameEngine strict ledger validation', () => {
    const getBaseState = (): GameState => ({
        code: 'TEST01',
        settings: { name: 'Test', maxPlayers: 9, initialStack: 1000, smallBlind: 10, bigBlind: 20 },
        status: 'playing',
        createdAt: {},
        hostId: 'p1',
        pot: 0,
        sidePots: [],
        currentTurnId: 'p2',
        dealerId: 'p1',
        round: 1,
        street: 'preflop',
        boardCards: [],
        highestBet: 0,
        totalChipsInPlay: 3000,
        playerOrder: ['p1', 'p2', 'p3'],
        players: {
            p1: { id: 'p1', name: 'P1', balance: 1000, status: 'active', position: 'dealer', isHost: true, avatar: 1 },
            p2: { id: 'p2', name: 'P2', balance: 1000, status: 'active', position: 'sb', isHost: false, avatar: 2 },
            p3: { id: 'p3', name: 'P3', balance: 1000, status: 'active', position: 'bb', isHost: false, avatar: 3 },
        }
    });

    it('validates a fresh clean state correctly', () => {
        const state = getBaseState();
        expect(validateLedger(state)).toBe(true);
    });

    it('validates correctly when chips have moved to the pot', () => {
        const state = getBaseState();
        state.players.p1.balance = 500;
        state.players.p2.balance = 500;
        state.players.p3.balance = 500;
        state.pot = 1500;

        expect(validateLedger(state)).toBe(true);
    });

    it('validates correctly when checking uncommitted bets', () => {
        const state = getBaseState();
        state.players.p1.balance = 800;
        state.players.p1.currentBet = 200; // still counts towards total

        expect(validateLedger(state)).toBe(true);
    });

    it('validates correctly with side pots', () => {
        const state = getBaseState();
        state.players.p1.balance = 0; // all in
        state.players.p2.balance = 0; // all in
        state.players.p3.balance = 500;
        state.pot = 1500;
        state.sidePots = [{ amount: 1000, eligiblePlayerIds: ['p2', 'p3'] }];

        expect(validateLedger(state)).toBe(true);
    });

    it('throws an error if a player is given extra chips from nowhere', () => {
        const state = getBaseState();
        state.players.p1.balance = 2000; // magically gained 1000

        expect(() => validateLedger(state)).toThrow(/Ledger mismatch/);
    });

    it('throws an error if chips disappear from the pot', () => {
        const state = getBaseState();
        state.players.p1.balance -= 500;
        // forgot to add 500 to the pot

        expect(() => validateLedger(state)).toThrow(/Ledger mismatch/);
    });

    describe('withLedgerValidation', () => {
        it('returns the new state if strictly valid', () => {
            const state = getBaseState();
            const newState = withLedgerValidation(state, (draft) => {
                draft.players.p1.balance -= 100;
                draft.pot += 100;
            });
            expect(newState.pot).toBe(100);
            expect(newState.players.p1.balance).toBe(900);
        });

        it('throws and prevents state leak if invalid mutation occurs', () => {
            const state = Object.freeze(getBaseState()); // ensure no side effects mutate original
            expect(() => {
                withLedgerValidation(state, (draft) => {
                    draft.players.p1.balance -= 100; // loses 100, but doesn't go to pot
                });
            }).toThrow();
        });
    });
});

import { initializeRound } from '../gameEngine';

describe('Round Initialization', () => {
    const getLobbyState = (): GameState => ({
        code: 'TEST02',
        settings: { name: 'Test', maxPlayers: 9, initialStack: 1000, smallBlind: 10, bigBlind: 20 },
        status: 'lobby',
        createdAt: {},
        hostId: 'p1',
        pot: 0,
        sidePots: [],
        currentTurnId: null,
        dealerId: null,
        round: 0,
        street: 'preflop',
        boardCards: [],
        highestBet: 0,
        totalChipsInPlay: 3000,
        playerOrder: ['p1', 'p2', 'p3'],
        players: {
            p1: { id: 'p1', name: 'P1', balance: 1000, status: 'waiting', position: 'none', isHost: true, avatar: 1 },
            p2: { id: 'p2', name: 'P2', balance: 1000, status: 'waiting', position: 'none', isHost: false, avatar: 2 },
            p3: { id: 'p3', name: 'P3', balance: 1000, status: 'waiting', position: 'none', isHost: false, avatar: 3 },
        }
    });

    it('assigns dealer, SB, BB and deducts blinds', () => {
        const state = getLobbyState();
        const nextState = initializeRound(state);

        expect(nextState.round).toBe(1);
        expect(nextState.dealerId).toBe('p1');

        expect(nextState.players.p1.position).toBe('dealer');
        expect(nextState.players.p2.position).toBe('sb');
        expect(nextState.players.p3.position).toBe('bb');

        expect(nextState.players.p2.currentBet).toBe(10);
        expect(nextState.players.p3.currentBet).toBe(20);

        expect(nextState.players.p2.balance).toBe(990);
        expect(nextState.players.p3.balance).toBe(980);

        // Turn goes to UTG (since p1 is UTG in 3-handed) 
        // Wait, in 3 handed: p1=D, p2=SB, p3=BB. Next after BB is p1. So p1 is UTG.
        expect(nextState.currentTurnId).toBe('p1');

        // Ledger should be valid
        expect(validateLedger(nextState)).toBe(true);
    });

    it('assigns correctly for heads up (2 players)', () => {
        const state = getLobbyState();
        state.playerOrder = ['p1', 'p2'];
        delete state.players.p3;
        state.totalChipsInPlay = 2000;

        const nextState = initializeRound(state);

        expect(nextState.dealerId).toBe('p1');
        expect(nextState.players.p1.position).toBe('sb'); // Edge case: Dealer posts SB in heads up
        expect(nextState.players.p2.position).toBe('bb');

        expect(nextState.players.p1.currentBet).toBe(10);
        expect(nextState.players.p2.currentBet).toBe(20);

        // Dealer acts first preflop in heads up
        expect(nextState.currentTurnId).toBe('p1');
    });
});

import { advanceTurn, progressStreet } from '../gameEngine';

describe('Turn and Street Progression', () => {
    const getPlayingState = (): GameState => ({
        code: 'TEST03',
        settings: { name: 'Test', maxPlayers: 9, initialStack: 1000, smallBlind: 10, bigBlind: 20 },
        status: 'playing',
        createdAt: {},
        hostId: 'p1',
        pot: 0,
        sidePots: [],
        currentTurnId: 'p1', // UTG is p1 (dealer)
        dealerId: 'p1',
        round: 1,
        street: 'preflop',
        boardCards: [],
        highestBet: 20,
        totalChipsInPlay: 3000,
        playerOrder: ['p1', 'p2', 'p3'],
        players: {
            p1: { id: 'p1', name: 'P1', balance: 1000, status: 'active', position: 'dealer', isHost: true, avatar: 1, currentBet: 0 },
            p2: { id: 'p2', name: 'P2', balance: 990, status: 'active', position: 'sb', isHost: false, avatar: 2, currentBet: 10 },
            p3: { id: 'p3', name: 'P3', balance: 980, status: 'active', position: 'bb', isHost: false, avatar: 3, currentBet: 20 },
        }
    });

    it('advances turn to next active player', () => {
        const state = getPlayingState();
        expect(state.currentTurnId).toBe('p1');

        const nextState = advanceTurn(state);
        expect(nextState.currentTurnId).toBe('p2');

        const stateAfterP2 = advanceTurn(nextState);
        expect(stateAfterP2.currentTurnId).toBe('p3');
    });

    it('skips folded/eliminated players', () => {
        const state = getPlayingState();
        state.players.p2.status = 'folded'; // p2 folds

        const nextState = advanceTurn(state);
        expect(nextState.currentTurnId).toBe('p3'); // skips p2
    });

    it('progresses street and collects bets into pot', () => {
        const state = getPlayingState();
        // p1 calls 20
        state.players.p1.balance -= 20;
        state.players.p1.currentBet = 20;

        // p2 calls 10 more (already has 10)
        state.players.p2.balance -= 10;
        state.players.p2.currentBet = 20;

        // p3 already has 20

        const nextState = progressStreet(state);

        expect(nextState.street).toBe('flop');
        expect(nextState.pot).toBe(60); // 20+20+20
        expect(nextState.highestBet).toBe(0);
        expect(nextState.players.p1.currentBet).toBe(0);
        expect(nextState.players.p2.currentBet).toBe(0);

        // After preflop, turn starts with first active after dealer (p2 is SB)
        expect(nextState.currentTurnId).toBe('p2');
    });
});

import { handlePlayerAction } from '../gameEngine';

describe('Player Actions', () => {
    const getPlayingState = (): GameState => ({
        code: 'TEST04',
        settings: { name: 'Test', maxPlayers: 9, initialStack: 1000, smallBlind: 10, bigBlind: 20 },
        status: 'playing',
        createdAt: {},
        hostId: 'p1',
        pot: 0,
        sidePots: [],
        currentTurnId: 'p1', // UTG is p1 (dealer)
        dealerId: 'p1',
        round: 1,
        street: 'preflop',
        boardCards: [],
        highestBet: 20,
        totalChipsInPlay: 3000,
        playerOrder: ['p1', 'p2', 'p3'],
        players: {
            p1: { id: 'p1', name: 'P1', balance: 1000, status: 'active', position: 'dealer', isHost: true, avatar: 1, currentBet: 0 },
            p2: { id: 'p2', name: 'P2', balance: 990, status: 'active', position: 'sb', isHost: false, avatar: 2, currentBet: 10 },
            p3: { id: 'p3', name: 'P3', balance: 980, status: 'active', position: 'bb', isHost: false, avatar: 3, currentBet: 20 },
        }
    });

    it('handles fold correctly', () => {
        const state = getPlayingState();
        const nextState = handlePlayerAction(state, 'p1', 'fold');

        expect(nextState.players.p1.status).toBe('folded');
        expect(nextState.currentTurnId).toBe('p2');
    });

    it('handles call correctly', () => {
        const state = getPlayingState();
        const nextState = handlePlayerAction(state, 'p1', 'call');

        expect(nextState.players.p1.currentBet).toBe(20);
        expect(nextState.players.p1.balance).toBe(980);
        expect(nextState.currentTurnId).toBe('p2');
    });

    it('handles raise correctly', () => {
        const state = getPlayingState();
        // preflop: p1 raises to 60 total
        const nextState = handlePlayerAction(state, 'p1', 'raise', 60);

        expect(nextState.players.p1.currentBet).toBe(60);
        expect(nextState.players.p1.balance).toBe(940);
        expect(nextState.highestBet).toBe(60);
        expect(nextState.currentTurnId).toBe('p2');
    });

    it('throws if wrong player acts', () => {
        const state = getPlayingState();
        expect(() => handlePlayerAction(state, 'p2', 'call')).toThrowError(/Not your turn/);
    });

    it('throws if raise is less than highest bet', () => {
        const state = getPlayingState();
        expect(() => handlePlayerAction(state, 'p1', 'raise', 10)).toThrowError(/greater than current highest/);
    });
});

describe('Side Pots Calculation', () => {
    it('creates side pots correctly when unequal all-ins occur', () => {
        const state: GameState = {
            code: 'TEST05',
            settings: { name: 'Test', maxPlayers: 9, initialStack: 1000, smallBlind: 10, bigBlind: 20 },
            status: 'playing',
            createdAt: {},
            hostId: 'p1',
            pot: 0,
            sidePots: [],
            currentTurnId: null,
            dealerId: 'p1',
            round: 1,
            street: 'preflop',
            boardCards: [],
            highestBet: 1000,
            totalChipsInPlay: 1600,
            playerOrder: ['p1', 'p2', 'p3'],
            players: {
                p1: { id: 'p1', name: 'P1', balance: 0, status: 'all-in', position: 'dealer', isHost: true, avatar: 1, currentBet: 100 },
                p2: { id: 'p2', name: 'P2', balance: 0, status: 'all-in', position: 'sb', isHost: false, avatar: 2, currentBet: 500 },
                p3: { id: 'p3', name: 'P3', balance: 0, status: 'all-in', position: 'bb', isHost: false, avatar: 3, currentBet: 1000 },
            }
        };

        const nextState = progressStreet(state);

        // Expected Side Pots:
        // Pot 1 (Main): Min is 100. Everyone contributes 100. Amount = 100 * 3 = 300. Eligible: p1, p2, p3.
        // Remaining bets: p2 has 400, p3 has 900.
        // Pot 2: Min is 400. p2 and p3 contribute 400. Amount = 400 * 2 = 800. Eligible: p2, p3.
        // Remaining bets: p3 has 500.
        // Pot 3: Min is 500. p3 contributes 500. Amount = 500. Eligible: p3.

        // Wait, our algorithm puts the first one in `draft.pot` and the rest in `draft.sidePots`.
        expect(nextState.pot).toBe(300);
        expect(nextState.sidePots.length).toBe(2);

        expect(nextState.sidePots[0].amount).toBe(800);
        expect(nextState.sidePots[0].eligiblePlayerIds).toEqual(['p2', 'p3']);

        expect(nextState.sidePots[1].amount).toBe(500);
        expect(nextState.sidePots[1].eligiblePlayerIds).toEqual(['p3']);

        expect(validateLedger(nextState)).toBe(true);
    });
});

import { evaluateShowdown } from '../gameEngine';

describe('Showdown Evaluation', () => {
    it('awards the pot to the last remaining player if everyone else folds', () => {
        const state: GameState = {
            code: 'TEST06',
            settings: { name: 'Test', maxPlayers: 9, initialStack: 1000, smallBlind: 10, bigBlind: 20 },
            status: 'playing',
            createdAt: {},
            hostId: 'p1',
            pot: 500,
            sidePots: [{ amount: 200, eligiblePlayerIds: ['p1', 'p2'] }],
            currentTurnId: 'p2',
            dealerId: 'p1',
            round: 1,
            street: 'preflop',
            boardCards: [],
            highestBet: 0,
            totalChipsInPlay: 2000,
            playerOrder: ['p1', 'p2'],
            players: {
                p1: { id: 'p1', name: 'P1', balance: 1300, status: 'folded', position: 'dealer', isHost: true, avatar: 1, currentBet: 0 },
                p2: { id: 'p2', name: 'P2', balance: 0, status: 'active', position: 'bb', isHost: false, avatar: 2, currentBet: 0 },
            }
        };

        const nextState = evaluateShowdown(state);

        expect(nextState.players.p2.balance).toBe(700); // 0 + 500 (pot) + 200 (side pot)
        expect(nextState.pot).toBe(0);
        expect(nextState.sidePots.length).toBe(0);
        expect(nextState.currentTurnId).toBeNull();
        expect(validateLedger(nextState)).toBe(true);
    });

    it('splits pot evenly among tied hands', () => {
        const state: GameState = {
            code: 'TEST07',
            settings: { name: 'Test', maxPlayers: 9, initialStack: 1000, smallBlind: 10, bigBlind: 20 },
            status: 'playing',
            createdAt: {},
            hostId: 'p1',
            pot: 101, // 101 chips, so remainder will be 1
            sidePots: [],
            currentTurnId: null,
            dealerId: 'p1',
            round: 1,
            street: 'showdown',
            boardCards: ['As', 'Ks', 'Qs', 'Js', 'Ts'], // Royal flush on board!
            highestBet: 0,
            totalChipsInPlay: 2101,
            playerOrder: ['p1', 'p2'],
            players: {
                p1: { id: 'p1', name: 'P1', balance: 1000, status: 'active', position: 'dealer', isHost: true, avatar: 1, currentBet: 0, cards: ['2h', '3h'] },
                p2: { id: 'p2', name: 'P2', balance: 1000, status: 'active', position: 'bb', isHost: false, avatar: 2, currentBet: 0, cards: ['2d', '3d'] },
            }
        };

        const nextState = evaluateShowdown(state);

        // p1 gets 50 (floor(101/2)) + 1 (remainder) = 51
        // p2 gets 50
        expect(nextState.players.p1.balance).toBe(1051);
        expect(nextState.players.p2.balance).toBe(1050);
        expect(nextState.pot).toBe(0);
        expect(validateLedger(nextState)).toBe(true);
    });

    it('awards pot to correct winner based on hole cards', () => {
        const state: GameState = {
            code: 'TEST08',
            settings: { name: 'Test', maxPlayers: 9, initialStack: 1000, smallBlind: 10, bigBlind: 20 },
            status: 'playing',
            createdAt: {},
            hostId: 'p1',
            pot: 500,
            sidePots: [],
            currentTurnId: null,
            dealerId: 'p1',
            round: 1,
            street: 'showdown',
            boardCards: ['2s', '3s', '4s', '5s', '8c'],
            highestBet: 0,
            totalChipsInPlay: 2500,
            playerOrder: ['p1', 'p2'],
            players: {
                // p1 has 6s -> straight flush
                p1: { id: 'p1', name: 'P1', balance: 1000, status: 'active', position: 'dealer', isHost: true, avatar: 1, currentBet: 0, cards: ['6s', 'Ah'] },
                // p2 has As -> higher flush, but not SF
                p2: { id: 'p2', name: 'P2', balance: 1000, status: 'active', position: 'bb', isHost: false, avatar: 2, currentBet: 0, cards: ['As', 'Kd'] },
            }
        };

        const nextState = evaluateShowdown(state);

        expect(nextState.players.p1.balance).toBe(1500); // Winner!
        expect(nextState.players.p2.balance).toBe(1000);
        expect(nextState.pot).toBe(0);
        expect(validateLedger(nextState)).toBe(true);
    });
});



