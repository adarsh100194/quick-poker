import type { GameState } from './gameService';
import { Hand } from 'pokersolver';

/**
 * STRICT LEDGER RULE:
 * Sum(all player balances) + Pot + Sum(side pots) = Total Chips In Play
 * 
 * Throws an error if the ledger is mismatched.
 */
export function validateLedger(state: GameState): boolean {
    let sumBalances = 0;

    // 1. Sum up all player balances + their current uncommit bets
    for (const player of Object.values(state.players)) {
        sumBalances += player.balance;
        if (player.currentBet) {
            sumBalances += player.currentBet;
        }
    }

    // 2. Sum the main pot and side pots
    let sumPots = state.pot;
    for (const sidePot of state.sidePots) {
        sumPots += sidePot.amount;
    }

    const currentTotal = sumBalances + sumPots;

    if (currentTotal !== state.totalChipsInPlay) {
        throw new Error(`Ledger mismatch! Expected ${state.totalChipsInPlay} but got ${currentTotal} (Balances: ${sumBalances}, Pots: ${sumPots})`);
    }

    return true;
}

/**
 * Safe state transition wrapper. 
 * Allows modifying a drafted state and ensures the ledger remains balanced before saving.
 */
export function withLedgerValidation(
    currentState: GameState,
    mutation: (draft: GameState) => void
): GameState {
    const draftState = JSON.parse(JSON.stringify(currentState)) as GameState; // Deep clone for safety

    mutation(draftState);

    // Will throw if the mutation broke the ledger
    validateLedger(draftState);

    return draftState;
}

export function getNextActivePlayer(state: GameState, currentId: string): string | null {
    const order = state.playerOrder;
    if (order.length === 0) return null;

    let currentIndex = order.indexOf(currentId);
    if (currentIndex === -1) currentIndex = 0;

    for (let i = 1; i <= order.length; i++) {
        const nextIndex = (currentIndex + i) % order.length;
        const nextPlayerId = order[nextIndex];
        const player = state.players[nextPlayerId];
        if (player.status === 'active' || player.status === 'all-in') {
            // all-in players are in the hand but we shouldn't skip them for dealer position
            // wait, for turn assignment, we skip all-in players. But for dealer/SB/BB, all-in players might be assigned roles?
            // Let's just return anyone who is 'active' for turns.
            if (player.status === 'active') return nextPlayerId;
        }
    }
    return null;
}

export function initializeRound(state: GameState): GameState {
    return withLedgerValidation(state, (draft) => {
        draft.pot = 0;
        draft.sidePots = [];
        draft.boardCards = [];
        draft.street = 'preflop';
        draft.highestBet = draft.settings.bigBlind;
        draft.round += 1;

        const order = draft.playerOrder;
        if (order.length < 2) throw new Error("Not enough players");

        for (const pid of order) {
            const p = draft.players[pid];
            p.currentBet = 0;
            p.status = p.balance > 0 ? 'active' : 'eliminated';
            p.position = 'none';
            p.cards = undefined; // reset cards
        }

        if (!draft.dealerId) {
            draft.dealerId = order[0];
        } else {
            // Strictly speaking, we should rotate based on who is still uneliminated, but getNextActivePlayer handles it
            const nextDealer = getNextActivePlayer(draft, draft.dealerId);
            if (nextDealer) draft.dealerId = nextDealer;
        }

        const sbId = getNextActivePlayer(draft, draft.dealerId!);
        const bbId = getNextActivePlayer(draft, sbId!);
        const utgId = getNextActivePlayer(draft, bbId!);

        if (!sbId || !bbId || !utgId) throw new Error("Not enough active players");

        draft.players[draft.dealerId!].position = 'dealer';

        // Heads-up edge case: Dealer is SB, other is BB
        if (order.length === 2) {
            draft.players[draft.dealerId!].position = 'sb'; // override as dealer acts last preflop but posts SB
            draft.players[sbId].position = 'bb';
        } else {
            draft.players[sbId].position = 'sb';
            draft.players[bbId].position = 'bb';
            if (order.length > 3) {
                draft.players[utgId].position = 'utg';
            }
        }

        const postBlind = (playerId: string, amount: number) => {
            const p = draft.players[playerId];
            const actualBlind = Math.min(p.balance, amount);
            p.balance -= actualBlind;
            p.currentBet = actualBlind;
            if (p.balance === 0) p.status = 'all-in';
        };

        if (order.length === 2) {
            postBlind(draft.dealerId!, draft.settings.smallBlind);
            postBlind(sbId, draft.settings.bigBlind);
            draft.currentTurnId = draft.dealerId!; // dealer acts first preflop in heads up
        } else {
            postBlind(sbId, draft.settings.smallBlind);
            postBlind(bbId, draft.settings.bigBlind);
            draft.currentTurnId = utgId;
        }
    });
}

export function isBettingRoundComplete(state: GameState): boolean {
    const activePlayers = Object.values(state.players).filter(p => p.status === 'active');
    if (activePlayers.length <= 1) return true; // Everyone else folded or all-in

    // Check if everyone has matched the highest bet
    // For preflop, the BB has the option to check if there are no raises (highestBet === bb)
    // We'll trust the game flow to only call advanceTurn when appropriate, 
    // but typically a betting round is complete if all active players' currentBet === highestBet
    // and everyone has had a chance to act.
    return activePlayers.every(p => p.currentBet === state.highestBet);
}

export function advanceTurn(state: GameState): GameState {
    return withLedgerValidation(state, (draft) => {
        if (!draft.currentTurnId) return;

        // Find the next active player who hasn't folded or gone all-in
        const nextId = getNextActivePlayer(draft, draft.currentTurnId);

        if (!nextId || nextId === draft.currentTurnId) {
            // No other active players, the hand might be over (everyone folded to 1, or everyone is all in)
            draft.currentTurnId = null;
            return;
        }

        draft.currentTurnId = nextId;
    });
}

export function progressStreet(state: GameState): GameState {
    return withLedgerValidation(state, (draft) => {
        // Collect bets into pots
        // We will sort players by currentBet to segment into side pots
        let bettors = Object.values(draft.players).filter(p => p.currentBet && p.currentBet > 0);

        while (bettors.length > 0) {
            // Find the minimum bet among all active bettors
            const minBet = Math.min(...bettors.map(p => p.currentBet!));

            // Which players are eligible to win this bucket? (Not folded, and contributed)
            // Wait, even if they contributed, if they fold later, they are not eligible.
            // But right now, we just determine eligibility based on who is still active/all-in.
            const eligibleIds = bettors
                .filter(p => p.status !== 'folded')
                .map(p => p.id);

            let bucketAmount = 0;
            for (const p of bettors) {
                p.currentBet! -= minBet;
                bucketAmount += minBet;
            }

            const activePlayerIds = Object.values(draft.players)
                .filter(p => p.status !== 'folded' && p.status !== 'eliminated')
                .map(p => p.id);

            // It's the main pot if every non-folded player is eligible to win it
            const isMainPot = eligibleIds.length === activePlayerIds.length;

            if (isMainPot) {
                draft.pot += bucketAmount;
            } else {
                // If the last side pot has the exact same eligible players, merge it
                if (draft.sidePots.length > 0) {
                    const lastPot = draft.sidePots[draft.sidePots.length - 1];
                    const sameEligible = lastPot.eligiblePlayerIds.length === eligibleIds.length &&
                        lastPot.eligiblePlayerIds.every(id => eligibleIds.includes(id));

                    if (sameEligible) {
                        lastPot.amount += bucketAmount;
                        // Keep bettors who still have bet left
                        bettors = bettors.filter(p => p.currentBet! > 0);
                        continue;
                    }
                }

                // Create new side pot
                draft.sidePots.push({
                    amount: bucketAmount,
                    eligiblePlayerIds: eligibleIds
                });
            }

            // Keep bettors who still have bet left
            bettors = bettors.filter(p => p.currentBet! > 0);
        }

        // Clean up currentBets
        for (const p of Object.values(draft.players)) {
            p.currentBet = 0;
        }
        draft.highestBet = 0;

        switch (draft.street) {
            case 'preflop':
                draft.street = 'flop';
                if (draft.deck) draft.boardCards.push(draft.deck.pop()!, draft.deck.pop()!, draft.deck.pop()!);
                break;
            case 'flop':
                draft.street = 'turn';
                if (draft.deck) draft.boardCards.push(draft.deck.pop()!);
                break;
            case 'turn':
                draft.street = 'river';
                if (draft.deck) draft.boardCards.push(draft.deck.pop()!);
                break;
            case 'river':
                draft.street = 'showdown';
                break;
        }

        // Setup first actor for new street (first active player after dealer)
        if (draft.street !== 'showdown' && draft.dealerId) {
            draft.currentTurnId = getNextActivePlayer(draft, draft.dealerId);
            draft.lastTurnStartAt = Date.now();
        } else {
            draft.currentTurnId = null;
        }
    });
}

export function handlePlayerAction(state: GameState, playerId: string, action: 'fold' | 'call' | 'raise' | 'check', amount: number = 0): GameState {
    return withLedgerValidation(state, (draft) => {
        if (draft.currentTurnId !== playerId) {
            throw new Error("Not your turn");
        }

        const player = draft.players[playerId];
        const outstanding = draft.highestBet - (player.currentBet || 0);

        if (action === 'fold') {
            player.status = 'folded';
        }
        else if (action === 'check') {
            if (outstanding > 0) {
                throw new Error("Cannot check, there is an outstanding bet");
            }
        }
        else if (action === 'call') {
            // A call might put a player all-in if they have less than `outstanding`
            const callAmount = Math.min(player.balance, outstanding);
            player.balance -= callAmount;
            player.currentBet = (player.currentBet || 0) + callAmount;

            if (player.balance === 0) {
                player.status = 'all-in';
            }
        }
        else if (action === 'raise') {
            const totalBet = (player.currentBet || 0) + amount;

            if (totalBet <= draft.highestBet) {
                throw new Error("Raise amount must be greater than current highest bet");
            }
            if (amount > player.balance) {
                throw new Error("Cannot raise more than your balance");
            }

            player.balance -= amount;
            player.currentBet = totalBet;
            draft.highestBet = totalBet;

            if (player.balance === 0) {
                player.status = 'all-in';
            }
        }

        // Advance the turn
        const nextId = getNextActivePlayer(draft, playerId);

        // If hand is over (everyone else folded)
        const activeCount = Object.values(draft.players).filter(p => p.status === 'active' || p.status === 'all-in').length;
        if (activeCount === 1) {
            draft.currentTurnId = null; // Hand over smoothly
            return;
        }

        if (!nextId || nextId === playerId) {
            // Everyone is all-in
            draft.currentTurnId = null;
            return;
        }

        draft.currentTurnId = nextId;
        draft.lastTurnStartAt = Date.now();
    });
}

export function evaluateShowdown(state: GameState): GameState {
    return withLedgerValidation(state, (draft) => {
        // Collect all active/all-in players
        const eligiblePlayers = Object.values(draft.players).filter(p => p.status === 'active' || p.status === 'all-in');

        // If only 1 player remains, they win everything by default (everyone else folded)
        if (eligiblePlayers.length === 1) {
            const winner = eligiblePlayers[0];
            winner.balance += draft.pot;
            for (const sp of draft.sidePots) {
                winner.balance += sp.amount;
                sp.amount = 0;
            }
            draft.pot = 0;
            draft.sidePots = [];

            // Round is over
            draft.currentTurnId = null;
            return;
        }

        const solvedHands = new Map<string, any>();

        for (const p of eligiblePlayers) {
            if (p.cards) {
                const fullHand = [...p.cards, ...draft.boardCards];
                const solved = Hand.solve(fullHand);
                solved.playerId = p.id; // attach ID to know who won
                solvedHands.set(p.id, solved);
            }
        }

        const distributePot = (amount: number, eligibleIds: string[]) => {
            if (amount === 0) return;
            const handsToCompare = eligibleIds
                .map(id => solvedHands.get(id))
                .filter(h => h !== undefined);

            if (handsToCompare.length === 0) return;

            const winners = Hand.winners(handsToCompare);
            const splitAmount = Math.floor(amount / winners.length);
            let remainder = amount % winners.length;

            for (const w of winners) {
                const p = draft.players[w.playerId];
                p.balance += splitAmount;
                // Give odd chips to the earlier players
                if (remainder > 0) {
                    p.balance += 1;
                    remainder -= 1;
                }
            }
        };

        // Distribute Side Pots first
        for (const sp of draft.sidePots) {
            distributePot(sp.amount, sp.eligiblePlayerIds);
            sp.amount = 0; // Clear it out to satisfy ledger
        }

        // Distribute Main Pot 
        distributePot(draft.pot, eligiblePlayers.map(p => p.id));
        draft.pot = 0;
        draft.sidePots = [];

        // Round is over
        draft.currentTurnId = null;
    });
}

